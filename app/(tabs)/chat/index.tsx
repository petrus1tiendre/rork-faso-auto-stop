import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  MessageCircle, ChevronRight, Search,
  CheckCircle, XCircle, UserCheck, UserX,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
import SkeletonCard from '@/components/SkeletonCard';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ─── Types ─── */
interface PassengerBooking {
  id: string;
  trip_id: string;
  status: string;
  created_at: string;
  trips: {
    departure: string;
    arrival: string;
    trip_date: string;
    trip_time: string | null;
    user_id: string;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  } | null;
}

interface DriverBooking {
  id: string;
  trip_id: string;
  passenger_id: string;
  status: string;
  created_at: string;
  trips: {
    departure: string;
    arrival: string;
    trip_date: string;
    trip_time: string | null;
  } | null;
  passenger_profile: { full_name: string | null; avatar_url: string | null } | null;
}

/* ─── Helpers ─── */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: '⏳ En attente',  color: Colors.orange },
  confirmed: { label: '✅ Confirmé',    color: Colors.green  },
  cancelled: { label: '❌ Annulé',      color: Colors.danger },
  completed: { label: '🏁 Terminé',     color: Colors.textMuted },
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch { return dateStr; }
}

function Avatar({ name, size = 44 }: { name: string | null; size?: number }) {
  return (
    <View style={[styles.initialsCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.35 }]}>{getInitials(name)}</Text>
    </View>
  );
}

/* ─── Fetch helpers ─── */
async function fetchPassengerBookings(userId: string | null): Promise<PassengerBooking[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select(`id, trip_id, status, created_at,
      trips ( departure, arrival, trip_date, trip_time, user_id,
        profiles ( full_name, avatar_url ) )`)
    .eq('passenger_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as PassengerBooking[];
}

async function fetchDriverBookings(userId: string | null): Promise<DriverBooking[]> {
  if (!userId) return [];
  // Get bookings for trips owned by this user
  const { data: myTrips } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', userId);
  if (!myTrips || myTrips.length === 0) return [];

  const tripIds = myTrips.map((t) => t.id);
  const { data, error } = await supabase
    .from('bookings')
    .select(`id, trip_id, passenger_id, status, created_at,
      trips ( departure, arrival, trip_date, trip_time )`)
    .in('trip_id', tripIds)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  // Fetch passenger profiles separately
  const passengerIds = [...new Set(data.map((b: any) => b.passenger_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', passengerIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

  return data.map((b: any) => ({
    ...b,
    passenger_profile: profileMap[b.passenger_id] ?? null,
  })) as DriverBooking[];
}

/* ─── Main component ─── */
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useApp();
  const [mode, setMode] = useState<'passenger' | 'driver'>('passenger');
  const [refreshing, setRefreshing] = useState(false);

  /* Passenger bookings */
  const passengerQuery = useQuery({
    queryKey: ['bookings-passenger', userId],
    queryFn: () => fetchPassengerBookings(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  /* Driver bookings */
  const driverQuery = useQuery({
    queryKey: ['bookings-driver', userId],
    queryFn: () => fetchDriverBookings(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  /* Confirm / Cancel mutations (driver side) */
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings-driver', userId] });
      queryClient.invalidateQueries({ queryKey: ['bookings-passenger', userId] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([passengerQuery.refetch(), driverQuery.refetch()]);
    setRefreshing(false);
  }, [passengerQuery, driverQuery]);

  const navigateToConversation = useCallback((
    bookingId: string, otherName: string | null,
    departure: string, arrival: string, status: string,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/conversation',
      params: {
        bookingId,
        otherName: otherName ?? 'Utilisateur',
        tripSummary: `${departure} → ${arrival}`,
        bookingStatus: status,
      },
    });
  }, [router]);

  const handleConfirm = useCallback((bookingId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateStatusMutation.mutate({ bookingId, status: 'confirmed' });
  }, [updateStatusMutation]);

  const handleCancel = useCallback((bookingId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    updateStatusMutation.mutate({ bookingId, status: 'cancelled' });
  }, [updateStatusMutation]);

  const passengerBookings = passengerQuery.data ?? [];
  const driverBookings = driverQuery.data ?? [];
  const pendingDriverCount = driverBookings.filter((b) => b.status === 'pending').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(66,165,245,0.10)', 'transparent']}
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
        <Text style={styles.subtitle}>Vos conversations et réservations</Text>

        {/* Mode toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setMode('passenger')}
            style={[styles.toggleBtn, mode === 'passenger' && styles.toggleBtnActive]}
          >
            <UserCheck size={14} color={mode === 'passenger' ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.toggleText, mode === 'passenger' && styles.toggleTextActive]}>
              Passager
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setMode('driver'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.toggleBtn, mode === 'driver' && styles.toggleBtnActive]}
          >
            <UserX size={14} color={mode === 'driver' ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.toggleText, mode === 'driver' && styles.toggleTextActive]}>
              Conducteur
            </Text>
            {pendingDriverCount > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeDotText}>{pendingDriverCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ─── PASSENGER MODE ─── */}
        {mode === 'passenger' && (
          <>
            {passengerQuery.isLoading && <><SkeletonCard /><SkeletonCard /></>}

            {!passengerQuery.isLoading && passengerBookings.map((booking) => {
              const driverName = booking.trips?.profiles?.full_name ?? 'Conducteur';
              const statusInfo = STATUS_LABELS[booking.status] ?? { label: booking.status, color: Colors.textMuted };
              const dep = booking.trips?.departure ?? '';
              const arr = booking.trips?.arrival ?? '';
              const dateStr = booking.trips?.trip_date ? formatFrenchDate(booking.trips.trip_date) : '';
              const timeStr = booking.trips?.trip_time?.slice(0, 5) ?? '';

              return (
                <Pressable
                  key={booking.id}
                  onPress={() => navigateToConversation(booking.id, driverName, dep, arr, booking.status)}
                >
                  <GlassCard style={styles.chatCard}>
                    <View style={styles.chatRow}>
                      <Avatar name={driverName} />
                      <View style={styles.chatInfo}>
                        <Text style={styles.chatName}>{driverName}</Text>
                        <Text style={styles.chatTrip} numberOfLines={1}>{dep} → {arr}</Text>
                        {dateStr ? (
                          <Text style={styles.chatDate}>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</Text>
                        ) : null}
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

            {!passengerQuery.isLoading && passengerBookings.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>Aucune réservation</Text>
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
          </>
        )}

        {/* ─── DRIVER MODE ─── */}
        {mode === 'driver' && (
          <>
            {driverQuery.isLoading && <><SkeletonCard /><SkeletonCard /></>}

            {!driverQuery.isLoading && driverBookings.length > 0 && (
              <GlassCard variant="accent" style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  💡 Confirmez ou annulez les demandes de réservation pour vos trajets.
                </Text>
              </GlassCard>
            )}

            {!driverQuery.isLoading && driverBookings.map((booking) => {
              const passengerName = booking.passenger_profile?.full_name ?? 'Passager';
              const statusInfo = STATUS_LABELS[booking.status] ?? { label: booking.status, color: Colors.textMuted };
              const dep = booking.trips?.departure ?? '';
              const arr = booking.trips?.arrival ?? '';
              const dateStr = booking.trips?.trip_date ? formatFrenchDate(booking.trips.trip_date) : '';
              const timeStr = booking.trips?.trip_time?.slice(0, 5) ?? '';
              const isPending = booking.status === 'pending';

              return (
                <GlassCard
                  key={booking.id}
                  variant={isPending ? 'accent' : 'default'}
                  style={styles.chatCard}
                >
                  <Pressable
                    onPress={() => navigateToConversation(booking.id, passengerName, dep, arr, booking.status)}
                  >
                    <View style={styles.chatRow}>
                      <Avatar name={passengerName} />
                      <View style={styles.chatInfo}>
                        <Text style={styles.chatName}>{passengerName}</Text>
                        <Text style={styles.chatTrip} numberOfLines={1}>{dep} → {arr}</Text>
                        {dateStr ? (
                          <Text style={styles.chatDate}>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</Text>
                        ) : null}
                        <Text style={[styles.chatStatus, { color: statusInfo.color }]}>
                          {statusInfo.label}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={Colors.textMuted} />
                    </View>
                  </Pressable>

                  {/* Confirm / Cancel buttons for pending bookings */}
                  {isPending && (
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => handleConfirm(booking.id)}
                        style={[styles.actionBtn, styles.actionBtnConfirm]}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle size={15} color={Colors.green} />
                        <Text style={[styles.actionBtnText, { color: Colors.green }]}>Confirmer</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleCancel(booking.id)}
                        style={[styles.actionBtn, styles.actionBtnCancel]}
                        disabled={updateStatusMutation.isPending}
                      >
                        <XCircle size={15} color={Colors.danger} />
                        <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Refuser</Text>
                      </Pressable>
                    </View>
                  )}
                </GlassCard>
              );
            })}

            {!driverQuery.isLoading && driverBookings.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🚗</Text>
                <Text style={styles.emptyTitle}>Aucune réservation reçue</Text>
                <Text style={styles.emptySubtext}>
                  Publiez un trajet pour recevoir des demandes de passagers
                </Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/publish')}
                  style={styles.emptyButton}
                >
                  <MessageCircle size={16} color={Colors.white} />
                  <Text style={styles.emptyButtonText}>Publier un trajet</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {!userId && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔐</Text>
            <Text style={styles.emptyTitle}>Connectez-vous</Text>
            <Text style={styles.emptySubtext}>
              Connectez-vous pour voir vos réservations et messages
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
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 14 },

  toggleRow: {
    flexDirection: 'row' as const, gap: 8, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.10)',
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 6,
    paddingVertical: 9, borderRadius: 11,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.white },
  badgeDot: {
    backgroundColor: Colors.danger, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center' as const, justifyContent: 'center' as const,
    paddingHorizontal: 4,
  },
  badgeDotText: { fontSize: 10, fontWeight: '800' as const, color: Colors.white },

  infoBanner: { marginBottom: 10 },
  infoBannerText: { fontSize: 13, color: Colors.primary, fontWeight: '500' as const, lineHeight: 18 },

  chatCard: { marginBottom: 10 },
  chatRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  initialsCircle: {
    backgroundColor: 'rgba(33,150,243,0.15)',
    borderWidth: 2, borderColor: 'rgba(33,150,243,0.25)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  initialsText: { fontWeight: '800' as const, color: Colors.primary },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  chatTrip: { fontSize: 12, color: Colors.primary, fontWeight: '500' as const, marginTop: 2 },
  chatDate: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  chatStatus: { fontSize: 12, fontWeight: '600' as const, marginTop: 3 },

  actionRow: {
    flexDirection: 'row' as const, gap: 8, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(33,150,243,0.08)',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 6,
    paddingVertical: 9, borderRadius: 10,
  },
  actionBtnConfirm: { backgroundColor: 'rgba(0,168,107,0.10)' },
  actionBtnCancel: { backgroundColor: 'rgba(239,68,68,0.08)' },
  actionBtnText: { fontSize: 13, fontWeight: '700' as const },

  emptyContainer: {
    alignItems: 'center' as const, paddingVertical: 48, paddingHorizontal: 24,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  emptySubtext: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const,
    lineHeight: 22, marginBottom: 22,
  },
  emptyButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 24,
    paddingVertical: 13, borderRadius: 14,
  },
  emptyButtonText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
});
