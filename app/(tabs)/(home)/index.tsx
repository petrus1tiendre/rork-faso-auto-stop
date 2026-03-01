import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp, useFilteredTrips } from '@/providers/AppProvider';
import TripCard from '@/components/TripCard';
import OfflineBanner from '@/components/OfflineBanner';
import GlassCard from '@/components/GlassCard';
import { TripType } from '@/types';

type FilterType = 'all' | TripType;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isOffline, isSyncing, trips, isLoading } = useApp();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const filteredTrips = useFilteredTrips(activeFilter);

  const totalTrips = trips.length;
  const intervilleCount = useMemo(() => trips.filter(t => t.type === 'interville').length, [trips]);
  const urbainCount = useMemo(() => trips.filter(t => t.type === 'urbain').length, [trips]);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [headerOpacity]);

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Tous', icon: <Zap size={14} color={activeFilter === 'all' ? Colors.background : Colors.textSecondary} /> },
    { key: 'urbain', label: 'Urbain Ouaga', icon: <MapPin size={14} color={activeFilter === 'urbain' ? Colors.background : Colors.textSecondary} /> },
    { key: 'interville', label: 'Ouaga ↔ Bobo', icon: <Navigation size={14} color={activeFilter === 'interville' ? Colors.background : Colors.textSecondary} /> },
  ];

  const handleTripPress = useCallback((tripId: string) => {
    router.push({ pathname: '/trip-details', params: { id: tripId } });
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0A0E1A', '#0D1525', '#0A0E1A']}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={['rgba(0, 191, 255, 0.06)', 'transparent']}
        style={styles.topGlow}
      />

      <OfflineBanner isOffline={isOffline} isSyncing={isSyncing} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={styles.greeting}>Salut !</Text>
          <Text style={styles.title}>Faso Auto-stop</Text>
          <Text style={styles.subtitle}>
            Partagez vos trajets, économisez ensemble
          </Text>
        </Animated.View>

        <GlassCard variant="accent" style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Trajets dispo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.accent }]}>{intervilleCount}</Text>
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

        <Text style={styles.sectionTitle}>Trajets disponibles</Text>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Chargement depuis le serveur...</Text>
          </View>
        )}

        {filteredTrips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => handleTripPress(trip.id)}
          />
        ))}

        {filteredTrips.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun trajet trouvé</Text>
            <Text style={styles.emptySubtext}>
              Changez le filtre ou publiez un nouveau trajet
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
  header: {
    marginBottom: 20,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statsCard: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
  },
  statItem: {
    alignItems: 'center' as const,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: Colors.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: 'center' as const,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center' as const,
  },
  loadingContainer: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});
