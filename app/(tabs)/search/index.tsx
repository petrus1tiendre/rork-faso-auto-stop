import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Search, MapPin, Navigation, Zap, SlidersHorizontal } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSearchTrips, useApp } from '@/providers/AppProvider';
import TripCard from '@/components/TripCard';
import GlassCard from '@/components/GlassCard';
import SortModal from '@/components/SortModal';
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
  const { refetchTrips, isLoading } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetchTrips();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetchTrips]);

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Tous', icon: <Zap size={13} color={activeFilter === 'all' ? Colors.white : Colors.textSecondary} /> },
    { key: 'urbain', label: 'Urbain', icon: <MapPin size={13} color={activeFilter === 'urbain' ? Colors.white : Colors.textSecondary} /> },
    { key: 'interville', label: 'Interville', icon: <Navigation size={13} color={activeFilter === 'interville' ? Colors.white : Colors.textSecondary} /> },
  ];

  const handleTripPress = useCallback((tripId: string) => {
    router.push({ pathname: '/trip-details', params: { id: tripId } });
  }, [router]);

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
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[
                styles.filterChip,
                activeFilter === f.key && styles.filterChipActive,
              ]}
            >
              {f.icon}
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f.key && styles.filterTextActive,
                ]}
              >
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

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {!isLoading && results.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => handleTripPress(trip.id)}
          />
        ))}

        {!isLoading && results.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <Search size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucun résultat</Text>
            <Text style={styles.emptySubtext}>
              Essayez un autre quartier ou changez le filtre
            </Text>
          </GlassCard>
        )}

        <View style={{ height: 20 }} />
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
  searchRow: {
    marginBottom: 14,
  },
  searchInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.12)',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  resultHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  resultCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  sortButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
  },
  sortText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  loadingContainer: {
    alignItems: 'center' as const,
    paddingVertical: 32,
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
