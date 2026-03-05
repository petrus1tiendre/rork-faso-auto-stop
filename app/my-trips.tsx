import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2, MapPin, Clock, Users, Coins, Car } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';
import { Trip } from '@/types';

export default function MyTripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useApp();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);

  const tripsQuery = useQuery({
    queryKey: ['myTrips', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) {
          console.log('[MyTrips] Fetch error:', error.message);
          return [];
        }
        return (data ?? []) as Trip[];
      } catch (e) {
        console.log('[MyTrips] Exception:', e);
        return [];
      }
    },
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTrips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['userTripsCount'] });
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
  });

  const { mutate: deleteTrip } = deleteMutation;
  const { refetch: refetchMyTrips } = tripsQuery;

  const handleDelete = useCallback((tripId: string) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer ce trajet ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteTrip(tripId) },
    ]);
  }, [deleteTrip]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetchMyTrips().finally(() => setRefreshing(false));
  }, [refetchMyTrips]);

  const trips = tripsQuery.data ?? [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <View style={styles.header}>
          <Car size={32} color={Colors.orange} />
          <Text style={styles.title}>Mes trajets publiés</Text>
          <Text style={styles.subtitle}>{trips.length} trajet{trips.length !== 1 ? 's' : ''}</Text>
        </View>

        {tripsQuery.isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {!tripsQuery.isLoading && trips.map((trip) => (
          <GlassCard key={trip.id} variant={trip.type === 'interville' ? 'warm' : 'accent'} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{trip.type === 'interville' ? 'INTERVILLE' : 'URBAIN'}</Text>
              </View>
              <View style={[styles.statusBadge, trip.status !== 'active' && styles.statusInactive]}>
                <Text style={styles.statusText}>{trip.status === 'active' ? 'Actif' : trip.status}</Text>
              </View>
            </View>
            <View style={styles.routeRow}>
              <MapPin size={14} color={Colors.primary} />
              <Text style={styles.routeText}>{trip.departure}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.routeText}>{trip.arrival}</Text>
            </View>
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Clock size={12} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{trip.trip_date} · {trip.trip_time?.slice(0, 5)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Users size={12} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{trip.seats} places</Text>
              </View>
              <View style={styles.detailItem}>
                <Coins size={12} color={Colors.orange} />
                <Text style={styles.detailText}>{trip.price_fcfa} FCFA</Text>
              </View>
            </View>
            <Pressable onPress={() => handleDelete(trip.id)} style={styles.deleteButton}>
              <Trash2 size={14} color={Colors.danger} />
              <Text style={styles.deleteText}>Supprimer</Text>
            </Pressable>
          </GlassCard>
        ))}

        {!tripsQuery.isLoading && trips.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <Car size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucun trajet publié</Text>
            <Text style={styles.emptySubtext}>Publiez votre premier trajet !</Text>
          </GlassCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  backButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 24 },
  backText: { fontSize: 15, color: Colors.text, fontWeight: '600' as const },
  header: { alignItems: 'center' as const, marginBottom: 24, gap: 6 },
  title: { fontSize: 24, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  loadingContainer: { alignItems: 'center' as const, paddingVertical: 32 },
  tripCard: { marginBottom: 12 },
  tripHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 10 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(33,150,243,0.12)' },
  typeText: { fontSize: 10, fontWeight: '700' as const, color: Colors.primary, letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(0,168,107,0.12)' },
  statusInactive: { backgroundColor: 'rgba(239,68,68,0.12)' },
  statusText: { fontSize: 10, fontWeight: '700' as const, color: Colors.green },
  routeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 8 },
  routeText: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  arrow: { fontSize: 14, color: Colors.textMuted },
  detailsRow: { flexDirection: 'row' as const, gap: 14, marginBottom: 10 },
  detailItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  detailText: { fontSize: 12, color: Colors.textSecondary },
  deleteButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', alignSelf: 'flex-start' as const },
  deleteText: { fontSize: 12, fontWeight: '600' as const, color: Colors.danger },
  emptyCard: { alignItems: 'center' as const, paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600' as const, color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textMuted },
});
