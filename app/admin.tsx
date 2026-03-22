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
  Eye,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';
import { Profile, Trip } from '@/types';

interface AdminBooking {
  id: string;
  status: string;
  created_at: string;
  trip_id: string;
  passenger_id: string;
  trips?: {
    departure: string;
    arrival: string;
    trip_date: string;
    trip_time: string | null;
    driver?: { full_name: string | null } | null;
  } | null;
  passenger?: { full_name: string | null; phone: string | null } | null;
}

interface AdminDocument {
  id: string;
  user_id: string;
  doc_type: string;
  file_url: string;
  status: string;
  notes: string | null;
  created_at: string;
  profiles?: { full_name: string | null; phone: string | null } | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  photo: '📷 Photo d\'identité',
  cnb: '🪪 CNB / CNIB',
  casier: '📄 Casier judiciaire',
};

type AdminTab = 'users' | 'trips' | 'bookings' | 'documents' | 'stats';

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

  /* ── Admin bookings query ── */
  const adminBookingsQuery = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      // Fetch bookings with trip info and passenger profile separately
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, status, created_at, trip_id, passenger_id, trips(departure, arrival, trip_date, trip_time, user_id)')
        .order('created_at', { ascending: false });
      if (error || !bookings) return [];

      // Fetch all unique passenger IDs and driver IDs
      const passengerIds = [...new Set(bookings.map((b: any) => b.passenger_id))];
      const driverIds = [...new Set(bookings.map((b: any) => b.trips?.user_id).filter(Boolean))];
      const allIds = [...new Set([...passengerIds, ...driverIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', allIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

      return bookings.map((b: any) => ({
        ...b,
        passenger: profileMap[b.passenger_id] ?? null,
        trips: b.trips ? { ...b.trips, driver: profileMap[b.trips.user_id] ?? null } : null,
      })) as AdminBooking[];
    },
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
    onError: (error: Error) => Alert.alert('Erreur', error.message),
  });

  const documentsQuery = useQuery({
    queryKey: ['admin-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, profiles(full_name, phone)')
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as AdminDocument[];
    },
  });

  const updateDocStatusMutation = useMutation({
    mutationFn: async ({ docId, status, notes }: { docId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('documents')
        .update({ status, notes: notes ?? null, updated_at: new Date().toISOString() })
        .eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-documents'] }),
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

  const { refetch: refetchDocuments } = documentsQuery;
  const { refetch: refetchAdminBookings } = adminBookingsQuery;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([refetchProfiles(), refetchTrips(), refetchDocuments(), refetchAdminBookings()]).finally(() => setRefreshing(false));
  }, [refetchProfiles, refetchTrips, refetchDocuments, refetchAdminBookings]);

  const profiles = profilesQuery.data ?? [];
  const allTrips = tripsQuery.data ?? [];
  const allDocs = documentsQuery.data ?? [];
  const allAdminBookings = adminBookingsQuery.data ?? [];
  const activeTrips = allTrips.filter(t => t.status === 'active');
  const verifiedUsers = profiles.filter(p => p.is_verified);
  const pendingDocs = allDocs.filter(d => d.status === 'pending');
  const pendingBookings = allAdminBookings.filter(b => b.status === 'pending');

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'users',     label: 'Utilisateurs', icon: <Users    size={14} color={activeTab === 'users'     ? Colors.white : Colors.textSecondary} /> },
    { key: 'trips',     label: 'Trajets',      icon: <Car      size={14} color={activeTab === 'trips'     ? Colors.white : Colors.textSecondary} /> },
    { key: 'bookings',  label: 'Réservations', icon: <CheckCircle size={14} color={activeTab === 'bookings' ? Colors.white : Colors.textSecondary} />, badge: pendingBookings.length },
    { key: 'documents', label: 'Documents',    icon: <FileText size={14} color={activeTab === 'documents' ? Colors.white : Colors.textSecondary} />, badge: pendingDocs.length },
    { key: 'stats',     label: 'Stats',        icon: <BarChart3 size={14} color={activeTab === 'stats'    ? Colors.white : Colors.textSecondary} /> },
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

  const renderBookingsTab = () => {
    const STATUS_COLORS: Record<string, string> = {
      pending: Colors.orange, confirmed: Colors.green,
      cancelled: Colors.danger, completed: Colors.textMuted,
    };
    const STATUS_LABELS: Record<string, string> = {
      pending: '⏳ En attente', confirmed: '✅ Confirmé',
      cancelled: '❌ Annulé', completed: '🏁 Terminé',
    };
    return (
      <>
        <Text style={styles.tabTitle}>
          {allAdminBookings.length} réservation{allAdminBookings.length !== 1 ? 's' : ''}
          {pendingBookings.length > 0 ? ` · ${pendingBookings.length} en attente` : ''}
        </Text>
        {adminBookingsQuery.isLoading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />}
        {!adminBookingsQuery.isLoading && allAdminBookings.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <CheckCircle size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucune réservation</Text>
          </GlassCard>
        )}
        {allAdminBookings.map((booking) => {
          const statusColor = STATUS_COLORS[booking.status] ?? Colors.textMuted;
          const statusLabel = STATUS_LABELS[booking.status] ?? booking.status;
          const passenger = booking.passenger?.full_name ?? 'Passager inconnu';
          const driver = booking.trips?.driver?.full_name ?? 'Conducteur inconnu';
          const dep = booking.trips?.departure ?? '?';
          const arr = booking.trips?.arrival ?? '?';
          const date = booking.trips?.trip_date ?? '';
          const time = booking.trips?.trip_time?.slice(0, 5) ?? '';
          return (
            <GlassCard key={booking.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.routeRow}>
                    <MapPin size={12} color={Colors.primary} />
                    <Text style={styles.routeText}>{dep} → {arr}</Text>
                  </View>
                  {date ? (
                    <View style={styles.tripMeta}>
                      <Clock size={12} color={Colors.textMuted} />
                      <Text style={styles.itemDetail}>{date}{time ? ` · ${time}` : ''}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.badge, { backgroundColor: `${statusColor}18` }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
              <Text style={styles.itemDetail}>👤 Passager : {passenger}</Text>
              <Text style={styles.itemDetail}>🚗 Conducteur : {driver}</Text>
              <Text style={styles.itemDetail}>
                📅 {new Date(booking.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
              {booking.status === 'pending' && (
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: 'confirmed' })}
                    style={[styles.actionBtn, styles.actionBtnSuccess]}
                    disabled={updateBookingStatusMutation.isPending}
                  >
                    <CheckCircle size={14} color={Colors.green} />
                    <Text style={[styles.actionBtnText, { color: Colors.green }]}>Confirmer</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateBookingStatusMutation.mutate({ bookingId: booking.id, status: 'cancelled' })}
                    style={[styles.actionBtn, styles.actionBtnDanger]}
                    disabled={updateBookingStatusMutation.isPending}
                  >
                    <XCircle size={14} color={Colors.danger} />
                    <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Annuler</Text>
                  </Pressable>
                </View>
              )}
            </GlassCard>
          );
        })}
      </>
    );
  };

  const renderDocumentsTab = () => {
    const DOC_STATUS_COLORS: Record<string, string> = {
      pending: Colors.orange,
      approved: Colors.green,
      rejected: Colors.danger,
    };
    return (
      <>
        <Text style={styles.tabTitle}>
          {allDocs.length} document{allDocs.length !== 1 ? 's' : ''}
          {pendingDocs.length > 0 ? ` · ${pendingDocs.length} en attente` : ''}
        </Text>
        {documentsQuery.isLoading && (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        )}
        {!documentsQuery.isLoading && allDocs.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <FileText size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucun document soumis</Text>
            <Text style={styles.emptySubtext}>
              Les documents d'identité des utilisateurs apparaîtront ici
            </Text>
          </GlassCard>
        )}
        {allDocs.map((doc) => {
          const statusColor = DOC_STATUS_COLORS[doc.status] ?? Colors.textMuted;
          const userName = (doc as any).profiles?.full_name ?? 'Utilisateur inconnu';
          const userPhone = (doc as any).profiles?.phone ?? '';
          return (
            <GlassCard key={doc.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</Text>
                  <Text style={styles.itemDetail}>👤 {userName}{userPhone ? ` · ${userPhone}` : ''}</Text>
                  <Text style={styles.itemDetail}>
                    📅 {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${statusColor}18` }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {doc.status === 'pending' ? 'En attente' : doc.status === 'approved' ? 'Approuvé' : 'Refusé'}
                  </Text>
                </View>
              </View>
              {doc.notes ? (
                <Text style={[styles.itemDetail, { color: Colors.danger, marginBottom: 6 }]}>
                  Note : {doc.notes}
                </Text>
              ) : null}
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => Linking.openURL(doc.file_url)}
                  style={[styles.actionBtn, styles.actionBtnSuccess]}
                >
                  <Eye size={14} color={Colors.primary} />
                  <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Voir</Text>
                </Pressable>
                {doc.status !== 'approved' && (
                  <Pressable
                    onPress={() => updateDocStatusMutation.mutate({ docId: doc.id, status: 'approved' })}
                    style={[styles.actionBtn, styles.actionBtnSuccess]}
                    disabled={updateDocStatusMutation.isPending}
                  >
                    <ThumbsUp size={14} color={Colors.green} />
                    <Text style={[styles.actionBtnText, { color: Colors.green }]}>Approuver</Text>
                  </Pressable>
                )}
                {doc.status !== 'rejected' && (
                  <Pressable
                    onPress={() => {
                      Alert.prompt(
                        'Refuser le document',
                        'Motif de refus (optionnel) :',
                        (notes) => updateDocStatusMutation.mutate({ docId: doc.id, status: 'rejected', notes: notes ?? '' }),
                        'plain-text',
                        '',
                      );
                    }}
                    style={[styles.actionBtn, styles.actionBtnDanger]}
                    disabled={updateDocStatusMutation.isPending}
                  >
                    <ThumbsDown size={14} color={Colors.danger} />
                    <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Refuser</Text>
                  </Pressable>
                )}
              </View>
            </GlassCard>
          );
        })}
      </>
    );
  };

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
              {tab.badge != null && tab.badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {activeTab === 'users'     && renderUsersTab()}
        {activeTab === 'trips'     && renderTripsTab()}
        {activeTab === 'bookings'  && renderBookingsTab()}
        {activeTab === 'documents' && renderDocumentsTab()}
        {activeTab === 'stats'     && renderStatsTab()}

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
  tabBadge: {
    backgroundColor: Colors.danger, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center' as const,
    justifyContent: 'center' as const, paddingHorizontal: 3,
  },
  tabBadgeText: { fontSize: 9, fontWeight: '800' as const, color: Colors.white },
});
