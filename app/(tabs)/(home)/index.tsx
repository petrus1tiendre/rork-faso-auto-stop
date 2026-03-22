import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Pressable, Animated,
  StatusBar, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, Zap, SlidersHorizontal, PlusCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp, useFilteredTrips } from '@/providers/AppProvider';
import TripCard from '@/components/TripCard';
import SkeletonCard from '@/components/SkeletonCard';
import GlassCard from '@/components/GlassCard';
import SortModal from '@/components/SortModal';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { TripType, SortType } from '@/types';

type FilterType = 'all' | TripType;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { trips, isLoading, refetchTrips, profile, userId } = useApp();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterType>('all');
  const [sortType, setSortType] = React.useState<SortType>('recent');
  const [showSort, setShowSort] = React.useState(false);

  /* ── Load already-booked trip IDs from DB (survives restarts) ── */
  const bookedTripsQuery = useQuery({
    queryKey: ['booked-trip-ids', userId],
    queryFn: async (): Promise<Set<string>> => {
      if (!userId) return new Set();
      const { data } = await supabase
        .from('bookings')
        .select('trip_id')
        .eq('passenger_id', userId)
        .in('status', ['pending', 'confirmed']);
      return new Set<string>((data ?? []).map((b: any) => b.trip_id as string));
    },
    enabled: !!userId,
    staleTime: 60000,
  });
  const bookedTripIds = bookedTripsQuery.data ?? new Set<string>();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchTrips(); } finally { setRefreshing(false); }
  }, [refetchTrips]);

  const filteredTrips = useFilteredTrips(activeFilter, sortType);
  const totalTrips = trips.length;
  const intervilleCount = useMemo(() => trips.filter(t => t.type === 'interville').length, [trips]);
  const urbainCount = useMemo(() => trips.filter(t => t.type === 'urbain').length, [trips]);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [headerOpacity]);

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Tous', icon: <Zap size={14} color={activeFilter === 'all' ? Colors.white : Colors.textSecondary} /> },
    { key: 'urbain', label: 'Urbain Ouaga', icon: <MapPin size={14} color={activeFilter === 'urbain' ? Colors.white : Colors.textSecondary} /> },
    { key: 'interville', label: 'Ouaga ↔ Bobo', icon: <Navigation size={14} color={activeFilter === 'interville' ? Colors.white : Colors.textSecondary} /> },
  ];

  const handleTripPress = useCallback((tripId: string) => {
    router.push({ pathname: '/trip-details', params: { id: tripId } });
  }, [router]);

  const handleBook = useCallback(async (tripId: string, driverName: string) => {
    if (!userId) {
      showToast('❌ Connectez-vous pour réserver', 'error');
      return;
    }
    // Check DB-backed list (persists across restarts)
    if (bookedTripIds.has(tripId)) {
      showToast('ℹ️ Vous avez déjà réservé ce trajet', 'info');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase.from('bookings').insert({
      trip_id: tripId,
      passenger_id: userId,
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        // DB unique constraint caught it — refresh the local list
        queryClient.invalidateQueries({ queryKey: ['booked-trip-ids', userId] });
        showToast('ℹ️ Vous avez déjà réservé ce trajet', 'info');
      } else {
        showToast('❌ Erreur réseau. Vérifiez votre connexion.', 'error');
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Refresh the booked-ids cache so the button becomes disabled immediately
      queryClient.invalidateQueries({ queryKey: ['booked-trip-ids', userId] });
      showToast(`✅ Réservé ! Ouvrez "Messages" pour contacter ${driverName}.`, 'success');
      // Navigate to chat after short delay so toast is visible
      setTimeout(() => router.push('/(tabs)/chat'), 1800);
    }
  }, [userId, bookedTripIds, showToast, queryClient, router]);

  const greeting = profile?.full_name ? `Salut ${profile.full_name.split(' ')[0]} 👋` : 'Salut 👋';

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.title}>Faso Auto-stop</Text>
          <Text style={styles.subtitle}>Partagez vos trajets, économisez ensemble</Text>
        </Animated.View>

        <GlassCard variant="accent" style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Trajets dispo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.orange }]}>{intervilleCount}</Text>
              <Text style={styles.statLabel}>Interville</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.green }]}>{urbainCount}</Text>
              <Text style={styles.statLabel}>Urbain</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.filterRow}>
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(f.key);
              }}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            >
              {f.icon}
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Trajets disponibles</Text>
          <Pressable onPress={() => setShowSort(true)} style={styles.sortButton}>
            <SlidersHorizontal size={14} color={Colors.textSecondary} />
            <Text style={styles.sortText}>Trier</Text>
          </Pressable>
        </View>

        {/* Skeleton loading */}
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Trip cards */}
        {!isLoading && filteredTrips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => handleTripPress(trip.id)}
            onBook={
              trip.user_id !== userId && !!userId
                ? bookedTripIds.has(trip.id)
                  ? null   // already booked → TripCard shows disabled state
                  : () => handleBook(trip.id, trip.profiles?.full_name ?? 'le conducteur')
                : undefined
            }
            alreadyBooked={bookedTripIds.has(trip.id)}
          />
        ))}

        {/* Empty state */}
        {!isLoading && filteredTrips.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyTitle}>Aucun trajet disponible</Text>
            <Text style={styles.emptySubtext}>
              {trips.length === 0
                ? 'Soyez le premier à publier un trajet !'
                : 'Aucun trajet ne correspond à ce filtre.'}
            </Text>
            {trips.length === 0 && (
              <Pressable
                onPress={() => router.push('/(tabs)/publish')}
                style={styles.emptyButton}
              >
                <PlusCircle size={16} color={Colors.white} />
                <Text style={styles.emptyButtonText}>Publier le premier trajet</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <SortModal
        visible={showSort}
        onClose={() => setShowSort(false)}
        currentSort={sortType}
        onSelect={setSortType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topGlow: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 300 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  header: { marginBottom: 20, paddingTop: 8 },
  greeting: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' as const },
  title: { fontSize: 28, fontWeight: '800' as const, color: Colors.text, marginTop: 2 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  statsCard: { marginBottom: 20 },
  statsRow: { flexDirection: 'row' as const, justifyContent: 'space-around' as const, alignItems: 'center' as const },
  statItem: { alignItems: 'center' as const },
  statNumber: { fontSize: 24, fontWeight: '800' as const, color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(33, 150, 243, 0.10)' },
  filterRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 20 },
  filterChip: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1, borderColor: 'rgba(33, 150, 243, 0.12)',
    minHeight: 40,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },
  sectionRow: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  sortButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.60)', minHeight: 36,
  },
  sortText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  emptyContainer: { alignItems: 'center' as const, paddingVertical: 48, paddingHorizontal: 16 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  emptySubtext: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const,
    lineHeight: 22, marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, minHeight: 50,
  },
  emptyButtonText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
});
