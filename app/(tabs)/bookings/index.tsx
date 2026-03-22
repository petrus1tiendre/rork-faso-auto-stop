import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Pressable,
  StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  CalendarCheck, Car, MapPin, Clock, Users, Star,
  BadgeCheck, ArrowRight, ChevronRight, AlertTriangle,
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
import { supabase } from '@/lib/supabase';

/* ─── helpers ─────────────────────────────────────────────────── */
function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}
function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/* ─── types ────────────────────────────────────────────────────── */
interface PassengerBooking {
  id: string;
  status: string;
  created_at: string;
  trip: {
    id: string;
    departure: string;
    arrival: string;
    trip_date: string;
    trip_time: string;
    price_fcfa: number;
    type: string;
    seats: number;
    user_id: string;
  };
  driver_profile: {
    full_name: string;
    avatar_url: string | null;
    rating: number;
    is_verified: boolean;
    phone: string | null;
  } | null;
  co_passengers: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }[];
}

interface DriverTrip {
  id: string;
  departure: string;
  arrival: string;
  trip_date: string;
  trip_time: string;
  price_fcfa: number;
  type: string;
  seats: number;
  original_seats: number;
  status: string;
  passengers: {
    booking_id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  }[];
}

type TabType = 'passenger' | 'driver';

/* ─── component ────────────────────────────────────────────────── */
export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { userId, profile } = useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('passenger');
  const [refreshing, setRefreshing] = useState(false);

  const isVerified = profile?.is_verified ?? false;

  /* ── Passenger bookings ─── */
  const passengerQuery = useQuery({
    queryKey: ['my-bookings-passenger', userId],
    queryFn: async (): Promise<PassengerBooking[]> => {
      if (!userId) return [];
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, status, created_at, trip_id')
        .eq('passenger_id', userId)
        .in('status', ['confirmed', 'pending', 'cancelled'])
        .order('created_at', { ascending: false });
      if (error || !bookings?.length) return [];

      const results: PassengerBooking[] = [];
      for (const booking of bookings) {
        const { data: tripData } = await supabase
          .from('trips')
          .select('id, departure, arrival, trip_date, trip_time, price_fcfa, type, seats, user_id')
          .eq('id', booking.trip_id)
          .single();
        if (!tripData) continue;

        const { data: driverProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, rating, is_verified, phone')
          .eq('id', tripData.user_id)
          .single();

        // Co-passengers (other confirmed bookings on same trip, excluding self)
        const { data: coBookings } = await supabase
          .from('bookings')
          .select('passenger_id')
          .eq('trip_id', booking.trip_id)
          .eq('status', 'confirmed')
          .neq('passenger_id', userId);

        const coPassengers: PassengerBooking['co_passengers'] = [];
        if (coBookings) {
          for (const cb of coBookings) {
            const { data: coProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', cb.passenger_id)
              .single();
            if (coProfile) {
              coPassengers.push({ id: cb.passenger_id, ...coProfile });
            }
          }
        }

        results.push({
          id: booking.id,
          status: booking.status,
          created_at: booking.created_at,
          trip: tripData,
          driver_profile: driverProfile ?? null,
          co_passengers: coPassengers,
        });
      }
      return results;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  /* ── Driver trips ─── */
  const driverQuery = useQuery({
    queryKey: ['my-trips-driver', userId],
    queryFn: async (): Promise<DriverTrip[]> => {
      if (!userId) return [];
      const { data: trips, error } = await supabase
        .from('trips')
        .select('id, departure, arrival, trip_date, trip_time, price_fcfa, type, seats, status')
        .eq('user_id', userId)
        .order('trip_date', { ascending: false });
      if (error || !trips?.length) return [];

      const results: DriverTrip[] = [];
      for (const trip of trips) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, passenger_id')
          .eq('trip_id', trip.id)
          .eq('status', 'confirmed');

        const passengers: DriverTrip['passengers'] = [];
        if (bookings) {
          for (const b of bookings) {
            const { data: pProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, phone')
              .eq('id', b.passenger_id)
              .single();
            if (pProfile) {
              passengers.push({ booking_id: b.id, ...pProfile });
            }
          }
        }

        // Compute original seats from bookings count + current seats
        const bookedSeats = passengers.length;
        results.push({
          ...trip,
          original_seats: trip.seats + bookedSeats,
          passengers,
        });
      }
      return results;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-bookings-passenger', userId] }),
      queryClient.invalidateQueries({ queryKey: ['my-trips-driver', userId] }),
    ]);
    setRefreshing(false);
  }, [queryClient, userId]);

  const handleCancelBooking = useCallback(async (bookingId: string) => {
    Alert.alert(
      'Annuler la réservation',
      'Voulez-vous vraiment annuler cette réservation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            // Find the booking to get trip_id
            const booking = passengerQuery.data?.find(b => b.id === bookingId);
            await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
            if (booking) {
              // Restore seat
              await supabase.rpc('increment_seats', { trip_id: booking.trip.id }).catch(() => {
                // Fallback: get current seats and increment
                supabase.from('trips').select('seats').eq('id', booking.trip.id).single().then(({ data }) => {
                  if (data) supabase.from('trips').update({ seats: data.seats + 1 }).eq('id', booking.trip.id);
                });
              });
            }
            queryClient.invalidateQueries({ queryKey: ['my-bookings-passenger', userId] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
          },
        },
      ]
    );
  }, [passengerQuery.data, queryClient, userId]);

  const todayStr = new Date().toISOString().slice(0, 10);

  /* ── Render passenger booking card ─── */
  const renderPassengerBooking = (booking: PassengerBooking) => {
    const { trip, driver_profile: driver, status } = booking;
    const isPast = trip.trip_date < todayStr;
    const isInterville = trip.type === 'interville';

    return (
      <GlassCard
        key={booking.id}
        variant={isInterville ? 'warm' : 'accent'}
        style={[styles.card, isPast && styles.cardPast]}
      >
        {/* Status + Type */}
        <View style={styles.cardTopRow}>
          <View style={[styles.typeTag, isInterville && styles.typeTagWarm]}>
            <Text style={[styles.typeText, isInterville && styles.typeTextWarm]}>
              {isInterville ? '🛣 INTERVILLE' : '🏙 URBAIN'}
            </Text>
          </View>
          <View style={[styles.statusBadge, status === 'confirmed' && styles.statusConfirmed, status === 'cancelled' && styles.statusCancelled]}>
            <Text style={[styles.statusText, status === 'confirmed' && styles.statusConfirmedText, status === 'cancelled' && styles.statusCancelledText]}>
              {status === 'confirmed' ? '✓ Confirmé' : status === 'cancelled' ? '✗ Annulé' : '⏳ En attente'}
            </Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <MapPin size={14} color={Colors.primary} />
          <Text style={styles.routeText} numberOfLines={1}>{trip.departure}</Text>
          <ArrowRight size={13} color={Colors.textMuted} />
          <MapPin size={14} color={isInterville ? Colors.orange : Colors.green} />
          <Text style={styles.routeText} numberOfLines={1}>{trip.arrival}</Text>
        </View>

        {/* Date + Time + Price */}
        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <Clock size={12} color={Colors.textSecondary} />
            <Text style={styles.detailChipText}>{formatFrenchDate(trip.trip_date)} à {trip.trip_time?.slice(0, 5)}</Text>
          </View>
          <Text style={[styles.priceText, isInterville && { color: Colors.orange }]}>
            {trip.price_fcfa.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        {/* Driver info */}
        {driver && (
          <View style={styles.driverRow}>
            {driver.avatar_url ? (
              <Image source={{ uri: driver.avatar_url }} style={styles.miniAvatar} />
            ) : (
              <View style={styles.miniAvatarInitials}>
                <Text style={styles.miniAvatarInitialsText}>{getInitials(driver.full_name)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.driverNameRow}>
                <Text style={styles.driverName}>{driver.full_name}</Text>
                {driver.is_verified && <BadgeCheck size={13} color={Colors.primary} />}
              </View>
              <View style={styles.ratingRow}>
                <Star size={10} color={Colors.orange} fill={Colors.orange} />
                <Text style={styles.ratingText}>{driver.rating?.toFixed(1)}</Text>
                {driver.phone ? <Text style={styles.phoneText}>· {driver.phone}</Text> : null}
              </View>
            </View>
          </View>
        )}

        {/* Co-passengers */}
        {booking.co_passengers.length > 0 && (
          <View style={styles.coPassRow}>
            <Users size={12} color={Colors.textMuted} />
            <Text style={styles.coPassLabel}>Co-passagers :</Text>
            {booking.co_passengers.map((cp) => (
              <View key={cp.id} style={styles.coPassItem}>
                {cp.avatar_url ? (
                  <Image source={{ uri: cp.avatar_url }} style={styles.coPassAvatar} />
                ) : (
                  <View style={styles.coPassAvatarInitials}>
                    <Text style={styles.coPassAvatarText}>{getInitials(cp.full_name)}</Text>
                  </View>
                )}
                <Text style={styles.coPassName}>{cp.full_name.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Cancel button for future bookings */}
        {!isPast && status === 'confirmed' && (
          <Pressable
            onPress={() => handleCancelBooking(booking.id)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Annuler la réservation</Text>
          </Pressable>
        )}
      </GlassCard>
    );
  };

  /* ── Render driver trip card ─── */
  const renderDriverTrip = (trip: DriverTrip) => {
    const isPast = trip.trip_date < todayStr;
    const isInterville = trip.type === 'interville';
    const bookedCount = trip.passengers.length;

    return (
      <GlassCard
        key={trip.id}
        variant={isInterville ? 'warm' : 'accent'}
        style={[styles.card, isPast && styles.cardPast]}
      >
        {/* Type + status */}
        <View style={styles.cardTopRow}>
          <View style={[styles.typeTag, isInterville && styles.typeTagWarm]}>
            <Text style={[styles.typeText, isInterville && styles.typeTextWarm]}>
              {isInterville ? '🛣 INTERVILLE' : '🏙 URBAIN'}
            </Text>
          </View>
          <View style={[styles.statusBadge, trip.status === 'active' && !isPast && styles.statusConfirmed]}>
            <Text style={[styles.statusText, trip.status === 'active' && !isPast && styles.statusConfirmedText]}>
              {isPast ? '✓ Passé' : trip.status === 'active' ? '🟢 Actif' : trip.status}
            </Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <MapPin size={14} color={Colors.primary} />
          <Text style={styles.routeText} numberOfLines={1}>{trip.departure}</Text>
          <ArrowRight size={13} color={Colors.textMuted} />
          <MapPin size={14} color={isInterville ? Colors.orange : Colors.green} />
          <Text style={styles.routeText} numberOfLines={1}>{trip.arrival}</Text>
        </View>

        {/* Date + seats + price */}
        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <Clock size={12} color={Colors.textSecondary} />
            <Text style={styles.detailChipText}>{formatFrenchDate(trip.trip_date)} à {trip.trip_time?.slice(0, 5)}</Text>
          </View>
          <Text style={[styles.priceText, isInterville && { color: Colors.orange }]}>
            {trip.price_fcfa.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        {/* Passenger count */}
        <View style={styles.seatsRow}>
          <Users size={13} color={Colors.green} />
          <Text style={styles.seatsText}>
            {bookedCount} passager{bookedCount !== 1 ? 's' : ''} / {trip.original_seats} place{trip.original_seats !== 1 ? 's' : ''}
          </Text>
          <View style={styles.seatsBar}>
            <View style={[styles.seatsBarFill, { width: `${Math.min(bookedCount / Math.max(trip.original_seats, 1), 1) * 100}%` as any }]} />
          </View>
        </View>

        {/* Passengers list */}
        {trip.passengers.length > 0 ? (
          <View style={styles.passengerList}>
            <Text style={styles.passengersTitle}>Passagers réservés :</Text>
            {trip.passengers.map((p) => (
              <View key={p.booking_id} style={styles.passengerRow}>
                {p.avatar_url ? (
                  <Image source={{ uri: p.avatar_url }} style={styles.miniAvatar} />
                ) : (
                  <View style={styles.miniAvatarInitials}>
                    <Text style={styles.miniAvatarInitialsText}>{getInitials(p.full_name)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.passengerName}>{p.full_name}</Text>
                  {p.phone ? <Text style={styles.passengerPhone}>{p.phone}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noPassengersText}>Aucun passager pour l'instant</Text>
        )}
      </GlassCard>
    );
  };

  const loading = activeTab === 'passenger' ? passengerQuery.isLoading : driverQuery.isLoading;
  const passBookings = passengerQuery.data ?? [];
  const driverTrips = driverQuery.data ?? [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(66, 165, 245, 0.15)', 'transparent']}
        style={styles.topGlow}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        <Text style={styles.pageTitle}>Mes réservations</Text>
        <Text style={styles.pageSubtitle}>Vos trajets en cours et passés</Text>

        {/* Verification banner */}
        {!isVerified && (
          <GlassCard variant="warm" style={styles.verifyBanner}>
            <AlertTriangle size={18} color={Colors.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyBannerTitle}>Vérification requise</Text>
              <Text style={styles.verifyBannerText}>Vérifiez votre identité pour réserver des trajets.</Text>
            </View>
            <Pressable onPress={() => router.push('/identity-verification')} style={styles.verifyBtn}>
              <Text style={styles.verifyBtnText}>Vérifier</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* Tab toggle */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab('passenger')}
            style={[styles.tabBtn, activeTab === 'passenger' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === 'passenger' && styles.tabTextActive]}>
              Passager
            </Text>
            {passBookings.filter(b => b.status === 'confirmed').length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{passBookings.filter(b => b.status === 'confirmed').length}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('driver')}
            style={[styles.tabBtn, activeTab === 'driver' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === 'driver' && styles.tabTextActive]}>
              Conducteur
            </Text>
            {driverTrips.filter(t => t.passengers.length > 0).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{driverTrips.filter(t => t.passengers.length > 0).length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'passenger' ? (
          passBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎫</Text>
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptySubtext}>Réservez un trajet depuis l'onglet Accueil.</Text>
              <Pressable onPress={() => router.push('/')} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Voir les trajets</Text>
              </Pressable>
            </View>
          ) : (
            passBookings.map(renderPassengerBooking)
          )
        ) : (
          driverTrips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🚗</Text>
              <Text style={styles.emptyTitle}>Aucun trajet publié</Text>
              <Text style={styles.emptySubtext}>Publiez un trajet depuis l'onglet Publier.</Text>
              <Pressable onPress={() => router.push('/(tabs)/publish')} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Publier un trajet</Text>
              </Pressable>
            </View>
          ) : (
            driverTrips.map(renderDriverTrip)
          )
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topGlow: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 300 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800' as const, color: Colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 16 },

  verifyBanner: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 16,
  },
  verifyBannerTitle: { fontSize: 13, fontWeight: '700' as const, color: Colors.orange },
  verifyBannerText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  verifyBtn: {
    backgroundColor: Colors.orange, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, minHeight: 34,
  },
  verifyBtnText: { fontSize: 12, fontWeight: '700' as const, color: Colors.white },

  tabRow: {
    flexDirection: 'row' as const, gap: 8, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 14, padding: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  tabBadge: {
    backgroundColor: Colors.primary, borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 11, fontWeight: '700' as const, color: Colors.white },

  card: { marginBottom: 12 },
  cardPast: { opacity: 0.7 },

  cardTopRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 10 },
  typeTag: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7,
    backgroundColor: 'rgba(33,150,243,0.12)',
  },
  typeTagWarm: { backgroundColor: 'rgba(255,153,51,0.12)' },
  typeText: { fontSize: 10, fontWeight: '700' as const, color: Colors.primary, letterSpacing: 0.8 },
  typeTextWarm: { color: Colors.orange },
  statusBadge: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7,
    backgroundColor: 'rgba(33,150,243,0.08)',
  },
  statusConfirmed: { backgroundColor: 'rgba(0,168,107,0.12)' },
  statusCancelled: { backgroundColor: 'rgba(239,68,68,0.08)' },
  statusText: { fontSize: 11, fontWeight: '600' as const, color: Colors.textMuted },
  statusConfirmedText: { color: Colors.green },
  statusCancelledText: { color: Colors.danger },

  routeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, marginBottom: 8, flexWrap: 'wrap' as const },
  routeText: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, flex: 1, minWidth: 60 },

  detailsRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 10 },
  detailChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  detailChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  priceText: { fontSize: 16, fontWeight: '800' as const, color: Colors.primary },

  driverRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(33,150,243,0.08)', marginBottom: 8 },
  driverNameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  driverName: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  ratingRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, marginTop: 2 },
  ratingText: { fontSize: 12, color: Colors.orange, fontWeight: '600' as const },
  phoneText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' as const },

  miniAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(66,165,245,0.25)' },
  miniAvatarInitials: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(33,150,243,0.12)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  miniAvatarInitialsText: { fontSize: 13, fontWeight: '700' as const, color: Colors.primary },

  coPassRow: { flexDirection: 'row' as const, alignItems: 'center' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 6 },
  coPassLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' as const },
  coPassItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  coPassAvatar: { width: 24, height: 24, borderRadius: 12 },
  coPassAvatarInitials: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(33,150,243,0.10)', alignItems: 'center' as const, justifyContent: 'center' as const },
  coPassAvatarText: { fontSize: 9, fontWeight: '700' as const, color: Colors.primary },
  coPassName: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },

  cancelBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)', alignItems: 'center' as const },
  cancelBtnText: { fontSize: 13, fontWeight: '600' as const, color: Colors.danger },

  seatsRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 10 },
  seatsText: { fontSize: 12, fontWeight: '600' as const, color: Colors.green },
  seatsBar: { flex: 1, height: 4, backgroundColor: 'rgba(0,168,107,0.12)', borderRadius: 2, overflow: 'hidden' as const },
  seatsBarFill: { height: 4, backgroundColor: Colors.green, borderRadius: 2 },

  passengerList: { paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(33,150,243,0.08)', gap: 8 },
  passengersTitle: { fontSize: 12, fontWeight: '700' as const, color: Colors.text, marginBottom: 6 },
  passengerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  passengerName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  passengerPhone: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  noPassengersText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const, paddingVertical: 10 },

  emptyContainer: { alignItems: 'center' as const, paddingVertical: 48 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const, marginBottom: 20 },
  emptyButton: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 13 },
  emptyButtonText: { fontSize: 14, fontWeight: '700' as const, color: Colors.white },
});
