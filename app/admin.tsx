import React, { useState, useCallback } from 'react';
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
import {
  ArrowLeft,
  Users,
  Car,
  FileText,
  BarChart3,
  BadgeCheck,
  Trash2,
  XCircle,
  CheckCircle,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';
import { Profile, Trip } from '@/types';

type AdminTab = 'users' | 'trips' | 'documents' | 'stats';

const ADMIN_EMAILS = ['hans2tiendrebeogo@gmail.com'];

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [refreshing, setRefreshing] = useState(false);

  // Check admin authorization
  const { data: sessionData } = useQuery({
    queryKey: ['admin-session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const isAdmin = sessionData?.user?.email && ADMIN_EMAILS.includes(sessionData.user.email);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 }}>Accès refusé</Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
            Vous n'avez pas les droits administrateur.
          </Text>
          <Pressable onPress={() => router.back()} style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
            <Text style={{ color: Colors.white, fontWeight: '700' }}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const profilesQuery = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as Profile[];
    },
  });

  const tripsQuery = useQuery({
    queryKey: ['admin-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as (Trip & { profiles: { full_name: string | null } | null })[];
    },
  });

  const toggleVerifyMutation = useMutation({
    mutationFn: async ({ userId, isVerified }: { userId: string; isVerified: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !isVerified })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: Error) => Alert.alert('Erreur', error.message),
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error: Error) => Alert.alert('Erreur', error.message),
  });

  const updateTripStatusMutation = useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: string }) => {
      const { error } = await supabase.from('trips').update({ status }).eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error: Error) => Alert.alert('Erreur', error.message),
  });

  const { mutate: deleteTrip } = deleteTripMutation;
  const { mutate: updateTripStatus } = updateTripStatusMutation;
  const { refetch: refetchProfiles } = profilesQuery;
  const { refetch: refetchTrips } = tripsQuery;

  const handleDeleteTrip = useCallback((tripId: string) => {
    Alert.alert('Supprimer', 'Supprimer ce trajet ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteTrip(tripId) },
    ]);
  }, [deleteTrip]);

  const handleToggleStatus = useCallback((tripId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'cancelled' : 'active';
    updateTripStatus({ tripId, status: newStatus });
  }, [updateTripStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([refetchProfiles(), refetchTrips()]).finally(() => setRefreshing(false));
  }, [refetchProfiles, refetchTrips]);

  const profiles = profilesQuery.data ?? [];
  const allTrips = tripsQuery.data ?? [];
  const activeTrips = allTrips.filter(t => t.status === 'active');
  const verifiedUsers = profiles.filter(p => p.is_verified);

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'users', label: 'Utilisateurs', icon: <Users size={14} color={activeTab === 'users' ? Colors.white : Colors.textSecondary} /> },
    { key: 'trips', label: 'Trajets', icon: <Car size={14} color={activeTab === 'trips' ? Colors.white : Colors.textSecondary} /> },
    { key: 'documents', label: 'Documents', icon: <FileText size={14} color={activeTab === 'documents' ? Colors.white : Colors.textSecondary} /> },
    { key: 'stats', label: 'Stats', icon: <BarChart3 size={14} color={activeTab === 'stats' ? Colors.white : Colors.textSecondary} /> },
  ];

  const renderUsersTab = () => (
    <>
      <Text style={styles.tabTitle}>{profiles.length} utilisateur{profiles.length !== 1 ? 's' : ''}</Text>
      {profilesQuery.isLoading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />}
      {profiles.map((p) => (
        <GlassCard key={p.id} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{p.full_name ?? 'Sans nom'}</Text>
            <View style={[styles.badge, p.is_verified ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={[styles.badgeText, p.is_verified ? styles.badgeTextGreen : styles.badgeTextRed]}>
                {p.is_verified ? 'Vérifié' : 'Non vérifié'}
              </Text>
            </View>
          </View>
          <Text style={styles.itemDetail}>Tél: {p.phone || 'N/A'}</Text>
          <Text style={styles.itemDetail}>Trajets: {p.total_trips}</Text>
          <Text style={styles.itemDetail}>Note: {p.rating}/5</Text>
          <Pressable
            onPress={() => toggleVerifyMutation.mutate({ userId: p.id, isVerified: p.is_verified })}
            style={[styles.actionBtn, p.is_verified ? styles.actionBtnDanger : styles.actionBtnSuccess]}
          >
            <BadgeCheck size={14} color={p.is_verified ? Colors.danger : Colors.green} />
            <Text style={[styles.actionBtnText, { color: p.is_verified ? Colors.danger : Colors.green }]}>
              {p.is_verified ? 'Retirer vérification' : 'Vérifier'}
            </Text>
          </Pressable>
        </GlassCard>
      ))}
    </>
  );

  const renderTripsTab = () => (
    <>
      <Text style={styles.tabTitle}>{allTrips.length} trajet{allTrips.length !== 1 ? 's' : ''}</Text>
      {tripsQuery.isLoading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />}
      {allTrips.map((trip) => (
        <GlassCard key={trip.id} variant={trip.status === 'active' ? 'accent' : 'default'} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.routeRow}>
              <MapPin size={12} color={Colors.primary} />
              <Text style={styles.routeText}>{trip.departure} → {trip.arrival}</Text>
            </View>
            <View style={[styles.badge, trip.status === 'active' ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={[styles.badgeText, trip.status === 'active' ? styles.badgeTextGreen : styles.badgeTextRed]}>
                {trip.status}
              </Text>
            </View>
          </View>
          <View style={styles.tripMeta}>
            <Clock size={12} color={Colors.textMuted} />
            <Text style={styles.itemDetail}>{trip.trip_date} · {trip.trip_time?.slice(0, 5)}</Text>
          </View>
          <Text style={styles.itemDetail}>Conducteur: {trip.profiles?.full_name ?? 'N/A'}</Text>
          <Text style={styles.itemDetail}>Prix: {trip.price_fcfa} FCFA · {trip.seats} places</Text>
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => handleToggleStatus(trip.id, trip.status)}
              style={[styles.actionBtn, trip.status === 'active' ? styles.actionBtnDanger : styles.actionBtnSuccess]}
            >
              {trip.status === 'active' ? (
                <XCircle size={14} color={Colors.danger} />
              ) : (
                <CheckCircle size={14} color={Colors.green} />
              )}
              <Text style={[styles.actionBtnText, { color: trip.status === 'active' ? Colors.danger : Colors.green }]}>
                {trip.status === 'active' ? 'Annuler' : 'Activer'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleDeleteTrip(trip.id)}
              style={[styles.actionBtn, styles.actionBtnDanger]}
            >
              <Trash2 size={14} color={Colors.danger} />
              <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Supprimer</Text>
            </Pressable>
          </View>
        </GlassCard>
      ))}
    </>
  );

  const renderDocumentsTab = () => (
    <>
      <Text style={styles.tabTitle}>Documents soumis</Text>
      <GlassCard style={styles.emptyCard}>
        <FileText size={40} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Aucun document soumis</Text>
        <Text style={styles.emptySubtext}>
          Les Bulletins N°3 soumis par les conducteurs apparaîtront ici
        </Text>
      </GlassCard>
    </>
  );

  const renderStatsTab = () => (
    <>
      <Text style={styles.tabTitle}>Statistiques</Text>
      <View style={styles.statsGrid}>
        <GlassCard variant="accent" style={styles.statCard}>
          <Text style={styles.statNumber}>{profiles.length}</Text>
          <Text style={styles.statLabel}>Utilisateurs total</Text>
        </GlassCard>
        <GlassCard variant="accent" style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.orange }]}>{allTrips.length}</Text>
          <Text style={styles.statLabel}>Trajets total</Text>
        </GlassCard>
        <GlassCard variant="accent" style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.green }]}>{activeTrips.length}</Text>
          <Text style={styles.statLabel}>Trajets actifs</Text>
        </GlassCard>
        <GlassCard variant="warm" style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.primary }]}>{verifiedUsers.length}</Text>
          <Text style={styles.statLabel}>Utilisateurs vérifiés</Text>
        </GlassCard>
      </View>

      <GlassCard style={styles.ratioCard}>
        <Text style={styles.ratioTitle}>Taux de vérification</Text>
        <View style={styles.ratioBar}>
          <View
            style={[
              styles.ratioFill,
              { width: profiles.length > 0 ? `${(verifiedUsers.length / profiles.length) * 100}%` : '0%' },
            ]}
          />
        </View>
        <Text style={styles.ratioText}>
          {verifiedUsers.length} / {profiles.length} ({profiles.length > 0 ? Math.round((verifiedUsers.length / profiles.length) * 100) : 0}%)
        </Text>
      </GlassCard>

      <GlassCard style={styles.ratioCard}>
        <Text style={styles.ratioTitle}>Trajets actifs vs total</Text>
        <View style={styles.ratioBar}>
          <View
            style={[
              styles.ratioFill,
              { width: allTrips.length > 0 ? `${(activeTrips.length / allTrips.length) * 100}%` : '0%', backgroundColor: Colors.green },
            ]}
          />
        </View>
        <Text style={styles.ratioText}>
          {activeTrips.length} / {allTrips.length} ({allTrips.length > 0 ? Math.round((activeTrips.length / allTrips.length) * 100) : 0}%)
        </Text>
      </GlassCard>
    </>
  );

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

        <Text style={styles.title}>Administration</Text>
        <Text style={styles.subtitle}>Panneau de gestion Faso Auto-stop</Text>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
            >
              {tab.icon}
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'trips' && renderTripsTab()}
        {activeTab === 'documents' && renderDocumentsTab()}
        {activeTab === 'stats' && renderStatsTab()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  backButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 16 },
  backText: { fontSize: 15, color: Colors.text, fontWeight: '600' as const },
  title: { fontSize: 26, fontWeight: '800' as const, color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 16 },
  tabRow: { flexDirection: 'row' as const, gap: 6, marginBottom: 20, flexWrap: 'wrap' as const },
  tabChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: 'rgba(33,150,243,0.12)' },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 11, fontWeight: '600' as const, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  tabTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  itemCard: { marginBottom: 10 },
  itemHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 8 },
  itemName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text, flex: 1 },
  itemDetail: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeGreen: { backgroundColor: 'rgba(0,168,107,0.12)' },
  badgeRed: { backgroundColor: 'rgba(239,68,68,0.12)' },
  badgeText: { fontSize: 10, fontWeight: '700' as const },
  badgeTextGreen: { color: Colors.green },
  badgeTextRed: { color: Colors.danger },
  actionsRow: { flexDirection: 'row' as const, gap: 8, marginTop: 8 },
  actionBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  actionBtnSuccess: { backgroundColor: 'rgba(0,168,107,0.08)' },
  actionBtnDanger: { backgroundColor: 'rgba(239,68,68,0.08)' },
  actionBtnText: { fontSize: 12, fontWeight: '600' as const },
  routeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, flex: 1 },
  routeText: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  tripMeta: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginBottom: 4 },
  emptyCard: { alignItems: 'center' as const, paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600' as const, color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' as const },
  statsGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10, marginBottom: 14 },
  statCard: { width: '47%' as any, alignItems: 'center' as const, paddingVertical: 20 },
  statNumber: { fontSize: 28, fontWeight: '800' as const, color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' as const },
  ratioCard: { marginBottom: 14 },
  ratioTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  ratioBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(33,150,243,0.10)', overflow: 'hidden' as const },
  ratioFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  ratioText: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
});
