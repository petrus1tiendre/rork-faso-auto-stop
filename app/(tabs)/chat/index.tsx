import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MessageCircle, Phone, ChevronRight, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
import SkeletonCard from '@/components/SkeletonCard';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface BookingChat {
  id: string;
  trip_id: string;
  status: string;
  created_at: string;
  trips: {
    departure: string;
    arrival: string;
    trip_date: string;
    trip_time: string | null;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: '⏳ En attente',  color: Colors.orange },
  confirmed: { label: '✅ Confirmé',    color: Colors.green  },
  cancelled: { label: '❌ Annulé',      color: Colors.danger },
  completed: { label: '🏁 Terminé',     color: Colors.textMuted },
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

async function fetchBookings(userId: string | null): Promise<BookingChat[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      trip_id,
      status,
      created_at,
      trips (
        departure,
        arrival,
        trip_date,
        trip_time,
        profiles (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as BookingChat[];
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', userId],
    queryFn: () => fetchBookings(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  const { data: bookingsData, isLoading: bookingsLoading, refetch } = bookingsQuery;
  const bookings = bookingsData ?? [];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const handleBookingPress = useCallback((booking: BookingChat) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const driverName = booking.trips?.profiles?.full_name ?? 'Conducteur';
    const departure  = booking.trips?.departure ?? '';
    const arrival    = booking.trips?.arrival ?? '';
    const dateStr    = booking.trips?.trip_date ?? '';
    const timeStr    = booking.trips?.trip_time?.slice(0, 5) ?? '';
    const statusInfo = STATUS_LABELS[booking.status] ?? { label: booking.status, color: Colors.textMuted };

    const lines = [
      `${departure} → ${arrival}`,
      dateStr ? formatFrenchDate(dateStr) : '',
      timeStr ? `Départ à ${timeStr}` : '',
      `Statut : ${statusInfo.label}`,
      '',
      'Contactez le conducteur directement pour organiser votre trajet.',
    ].filter(Boolean);

    Alert.alert(driverName, lines.join('\n'));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(66, 165, 245, 0.10)', 'transparent']}
        style={styles.topGlow}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Vos conversations de trajet</Text>

        <GlassCard variant="warm" style={styles.paymentBanner}>
          <View style={styles.paymentRow}>
            <Phone size={18} color={Colors.orange} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Paiement Orange Money / MoMo</Text>
              <Text style={styles.paymentSubtext}>
                Envoyez un lien de paiement directement dans le chat
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Skeleton loading */}
        {bookingsLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Booking cards */}
        {!bookingsLoading && bookings.map((booking) => {
          const driverName   = booking.trips?.profiles?.full_name ?? 'Conducteur';
          const driverAvatar = booking.trips?.profiles?.avatar_url ?? null;
          const isInterville = booking.trips?.departure !== booking.trips?.arrival;
          const statusInfo   = STATUS_LABELS[booking.status] ?? { label: booking.status, color: Colors.textMuted };

          return (
            <Pressable key={booking.id} onPress={() => handleBookingPress(booking)}>
              <GlassCard style={styles.chatCard}>
                <View style={styles.chatRow}>
                  {/* Avatar / Initials */}
                  {driverAvatar ? (
                    <View style={[styles.avatarCircle, { overflow: 'hidden' as const }]}>
                      {/* expo-image can't be used here without import; use plain View + Text as fallback */}
                      <View style={styles.initialsCircle}>
                        <Text style={styles.initialsText}>{getInitials(driverName)}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.initialsCircle}>
                      <Text style={styles.initialsText}>{getInitials(driverName)}</Text>
                    </View>
                  )}

                  <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{driverName}</Text>
                    <Text style={styles.chatTrip} numberOfLines={1}>
                      {booking.trips?.departure ?? ''} → {booking.trips?.arrival ?? ''}
                    </Text>
                    <Text style={[styles.chatStatus, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>

                  <ChevronRight size={16} color={Colors.textMuted} />
                </View>
              </GlassCard>
            </Pressable>
          );
        })}

        {/* Empty state */}
        {!bookingsLoading && bookings.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptySubtext}>
              Réservez un trajet pour discuter avec un conducteur
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              style={styles.emptyButton}
            >
              <Search size={16} color={Colors.white} />
              <Text style={styles.emptyButtonText}>Trouver un trajet</Text>
            </Pressable>
          </View>
        )}

        {/* Not logged in */}
        {!userId && !bookingsLoading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔐</Text>
            <Text style={styles.emptyTitle}>Connectez-vous</Text>
            <Text style={styles.emptySubtext}>
              Connectez-vous pour voir vos réservations et conversations
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topGlow: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 300 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: '800' as const, color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 16 },
  paymentBanner: { marginBottom: 16 },
  paymentRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  paymentInfo: { flex: 1 },
  paymentTitle: { fontSize: 13, fontWeight: '700' as const, color: Colors.orange },
  paymentSubtext: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  chatCard: { marginBottom: 10 },
  chatRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  initialsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(33, 150, 243, 0.25)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  initialsText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  chatTrip: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  chatStatus: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 3,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    minHeight: 50,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
