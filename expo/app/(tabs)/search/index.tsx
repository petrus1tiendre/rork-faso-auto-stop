import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput, Pressable,
  StatusBar, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Search, MapPin, Navigation, Zap, SlidersHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSearchTrips, useApp } from '@/providers/AppProvider';
import TripCard from '@/components/TripCard';
import SkeletonCard from '@/components/SkeletonCard';
import GlassCard from '@/components/GlassCard';
import SortModal from '@/components/SortModal';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { TripType, SortType } from '@/types';

type FilterType = 'all' | TripType;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [showSort, setShowSort] = useState(false);
  const results = useSearchTrips(query, activeFilter, sortType);
  const { refetchTrips, isLoading, userId } = useApp();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [bookingIds, setBookingIds] = useState<Set<string>>(new Set());

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchTrips(); } finally { setRefreshing(false); }
  }, [refetchTrips]);

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Tous', icon: <Zap size={13} color={activeFilter === 'all' ? Colors.white : Colors.textSecondary} /> },
    { key: 'urbain', label: 'Urbain', icon: <MapPin size={13} color={activeFilter === 'urbain' ? Colors.white : Colors.textSecondary} /> },
    { key: 'interville', label: 'Interville', icon: <Navigation size={13} color={activeFilter === 'interville' ? Colors.white : Colors.textSecondary} /> },
  ];

  const handleTripPress = useCallback((tripId: string) => {
    router.push({ pathname: '/trip-details', params: { id: tripId } });
  }, [router]);

  const handleBook = useCallback(async (tripId: string, driverName: string) => {
    if (!userId) {
      showToast('❌ Connectez-vous pour réserver', 'error');
      return;
    }
    if (bookingIds.has(tripId)) {
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
        showToast('ℹ️ Vous avez déjà réservé ce trajet', 'info');
      } else {
        showToast('❌ Erreur réseau. Vérifiez votre connexion.', 'error');
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBookingIds(prev => new Set([...prev, tripId]));
      showToast(`✅ Réservation envoyée à ${driverName} !`, 'success');
    }
  }, [userId, bookingIds, showToast]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(66, 165, 245, 0.12)', 'transparent']}
        style={styles.topGlow}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <Text style={styles.title}>Rechercher</Text>
        <Text style={styles.subtitle}>Trouvez votre trajet idéal</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Quartier, ville, conducteur..."
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Text style={styles.clearButton}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

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

        <View style={styles.resultHeader}>
          <Text style={styles.resultCount}>
            {results.length} trajet{results.length !== 1 ? 's' : ''} trouvé{results.length !== 1 ? 's' : ''}
          </Text>
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
          </>
        )}

        {/* Results */}
        {!isLoading && results.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => handleTripPress(trip.id)}
            onBook={trip.user_id !== userId ? () => handleBook(trip.id, trip.profiles?.full_name ?? 'le conducteur') : undefined}
          />
        ))}

        {/* Empty state */}
        {!isLoading && results.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>
              {query ? 'Aucun trajet trouvé' : 'Aucun trajet disponible'}
            </Text>
            <Text style={styles.emptySubtext}>
              {query
                ? `Aucun résultat pour "${query}". Essayez avec d'autres mots-clés.`
                : 'Il n\'y a pas encore de trajets publiés.'}
            </Text>
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
  title: { fontSize: 26, fontWeight: '800' as const, color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 16 },
  searchRow: { marginBottom: 14 },
  searchInputContainer: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
    borderWidth: 1, borderColor: 'rgba(33, 150, 243, 0.15)',
    borderRadius: 14, paddingHorizontal: 14, gap: 10, minHeight: 52,
  },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: Colors.text },
  clearButton: { fontSize: 16, color: Colors.textMuted, paddingHorizontal: 4 },
  filterRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  filterChip: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1, borderColor: 'rgba(33, 150, 243, 0.12)', minHeight: 40,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },
  resultHeader: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const,
    alignItems: 'center' as const, marginBottom: 12,
  },
  resultCount: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' as const },
  sortButton: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.60)', minHeight: 36,
  },
  sortText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  emptyContainer: { alignItems: 'center' as const, paddingVertical: 56, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  emptySubtext: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const, lineHeight: 22,
  },
});
