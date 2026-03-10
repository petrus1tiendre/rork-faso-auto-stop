import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Phone } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
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
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
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
        profiles (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as unknown as BookingChat[];
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
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

        {bookingsLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {!bookingsLoading && bookings.length > 0 && bookings.map((booking) => (
          <Pressable key={booking.id} onPress={() => Alert.alert(
            booking.trips?.profiles?.full_name ?? 'Conducteur',
            `Trajet: ${booking.trips?.departure ?? ''} → ${booking.trips?.arrival ?? ''}\nStatut: ${booking.status === 'pending' ? 'En attente' : booking.status === 'confirmed' ? 'Confirmé' : booking.status}\n\nContactez le conducteur directement pour organiser votre trajet.`
          )}>
            <GlassCard style={styles.chatCard}>
              <View style={styles.chatRow}>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>
                    {booking.trips?.profiles?.full_name ?? 'Conducteur'}
                  </Text>
                  <Text style={styles.chatTrip}>
                    {booking.trips?.departure ?? ''} → {booking.trips?.arrival ?? ''}
                  </Text>
                  <Text style={styles.chatStatus}>
                    Statut: {booking.status === 'pending' ? 'En attente' : booking.status === 'confirmed' ? 'Confirmé' : booking.status}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ))}

        {!bookingsLoading && bookings.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <MessageCircle size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucune conversation</Text>
            <Text style={styles.emptySubtext}>
              Réservez un trajet pour commencer à discuter
            </Text>
          </GlassCard>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  paymentBanner: {
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.orange,
  },
  paymentSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center' as const,
    paddingVertical: 32,
  },
  chatCard: {
    marginBottom: 10,
  },
  chatRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chatTrip: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  chatStatus: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center' as const,
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center' as const,
  },
});
