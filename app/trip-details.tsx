import React, { useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Clock, Users, Star, BadgeCheck, Heart,
  Phone, Shield, X, Car, Coins,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
import { supabase } from '@/lib/supabase';

export default function TripDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, isFavorite, toggleFavorite, userId, profile } = useApp();
  const queryClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const trip = trips.find((t) => t.id === id);
  const favorite = trip ? isFavorite(trip.id) : false;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 14,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  /* ── Check if user already has an active booking for this trip ── */
  const existingBookingQuery = useQuery({
    queryKey: ['existing-booking', trip?.id, userId],
    queryFn: async () => {
      if (!userId || !trip) return null;
      const { data } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('trip_id', trip.id)
        .eq('passenger_id', userId)
        .in('status', ['pending', 'confirmed'])
        .maybeSingle();
      return data as { id: string; status: string } | null;
    },
    enabled: !!userId && !!trip,
  });
  const existingBooking = existingBookingQuery.data ?? null;

  const userIsVerified = profile?.is_verified ?? false;

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !trip) throw new Error('Non connecté');
      if (trip.user_id === userId) throw new Error('Vous ne pouvez pas réserver votre propre trajet.');
      if (!userIsVerified) throw new Error('not_verified');
      if (existingBooking) throw new Error('already_booked');
      if (trip.seats <= 0) throw new Error('no_seats');

      // Insert as confirmed (auto-accept, no driver confirmation needed)
      const { data, error } = await supabase
        .from('bookings')
        .insert({ trip_id: trip.id, passenger_id: userId, status: 'confirmed' })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('already_booked');
        throw error;
      }

      // Decrement seats
      await supabase.from('trips')
        .update({ seats: Math.max(trip.seats - 1, 0) })
        .eq('id', trip.id);

      return data;
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      existingBookingQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['my-bookings-passenger', userId] });
      Alert.alert(
        '✅ Réservé !',
        'Votre place est confirmée. Retrouvez les détails dans l\'onglet "Réservations".',
        [
          { text: 'Voir mes réservations', onPress: () => { router.back(); router.push('/(tabs)/bookings'); } },
          { text: 'OK', style: 'cancel' },
        ]
      );
    },
    onError: (error: Error) => {
      if (error.message === 'not_verified') {
        Alert.alert(
          '🔒 Vérification requise',
          'Vous devez vérifier votre identité avant de réserver.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Vérifier maintenant', onPress: () => router.push('/identity-verification') },
          ]
        );
      } else if (error.message === 'already_booked') {
        existingBookingQuery.refetch();
        Alert.alert('Déjà réservé', 'Vous avez déjà une réservation active pour ce trajet. Retrouvez-la dans l\'onglet Réservations.');
      } else if (error.message === 'no_seats') {
        Alert.alert('Complet', 'Ce trajet n\'a plus de places disponibles.');
      } else {
        Alert.alert('Erreur', error.message);
      }
    },
  });

  const handleFavorite = useCallback(() => {
    if (trip) {
      toggleFavorite(trip.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [trip, toggleFavorite]);

  const { mutate: bookMutate } = bookMutation;

  const handleContact = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Confirmer la réservation',
      `Réserver une place sur ce trajet ? La réservation est immédiate et confirmée automatiquement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réserver maintenant', onPress: () => bookMutate() },
      ]
    );
  }, [bookMutate]);

  const handlePayment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!trip) return;
    Alert.alert(
      'Paiement Orange Money',
      `Montant: ${trip.price_fcfa.toLocaleString()} FCFA\n\nPour payer, envoyez ce montant via Orange Money ou MoMo au conducteur après avoir réservé.\n\nÉtape 1: Réservez d'abord le trajet\nÉtape 2: Contactez le conducteur\nÉtape 3: Effectuez le paiement mobile`,
      [{ text: 'Compris' }]
    );
  }, [trip]);

  if (!trip) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFill} />
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorText}>Trajet introuvable</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Retour</Text>
          </Pressable>
        </GlassCard>
      </View>
    );
  }

  const isInterville = trip.type === 'interville';
  const driverName = trip.profiles?.full_name ?? 'Conducteur';
  const driverAvatar = trip.profiles?.avatar_url ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face';
  const driverRating = trip.profiles?.rating ?? 5.0;
  const driverTrips = trip.profiles?.total_trips ?? 0;
  const isVerified = trip.profiles?.is_verified ?? false;
  const dateDisplay = trip.trip_date ? trip.trip_date.slice(5) : '';
  const timeDisplay = trip.trip_time ? trip.trip_time.slice(0, 5) : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={isInterville ? ['rgba(255, 153, 51, 0.12)', 'transparent'] : ['rgba(66, 165, 245, 0.15)', 'transparent']}
        style={styles.topGlow}
      />

      <View style={[styles.closeRow, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={20} color={Colors.text} />
        </Pressable>
        <Pressable onPress={handleFavorite} style={styles.favoriteButton}>
          <Heart
            size={20}
            color={favorite ? Colors.danger : Colors.textSecondary}
            fill={favorite ? Colors.danger : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.typeBadgeRow}>
            <View style={[styles.typeBadge, isInterville && styles.typeBadgeWarm]}>
              <Text style={[styles.typeBadgeText, isInterville && styles.typeBadgeTextWarm]}>
                {isInterville ? 'INTERVILLE' : 'URBAIN OUAGA'}
              </Text>
            </View>
          </View>

          <GlassCard variant={isInterville ? 'warm' : 'accent'} style={styles.routeCard}>
            <View style={styles.routeMain}>
              <View style={styles.routeLeft}>
                <View style={styles.routeDot}>
                  <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                </View>
                <View style={styles.routeLineVertical} />
                <View style={styles.routeDot}>
                  <View style={[styles.dot, { backgroundColor: isInterville ? Colors.orange : Colors.green }]} />
                </View>
              </View>
              <View style={styles.routeDetails}>
                <View style={styles.routePoint}>
                  <Text style={styles.routeLabel}>DÉPART</Text>
                  <Text style={styles.routePlace}>{trip.departure}</Text>
                </View>
                <View style={styles.routePoint}>
                  <Text style={styles.routeLabel}>ARRIVÉE</Text>
                  <Text style={styles.routePlace}>{trip.arrival}</Text>
                </View>
              </View>
            </View>
          </GlassCard>

          <View style={styles.infoGrid}>
            <GlassCard style={styles.infoItem}>
              <Clock size={18} color={Colors.primary} />
              <Text style={styles.infoValue}>{timeDisplay}</Text>
              <Text style={styles.infoLabel}>{dateDisplay}</Text>
            </GlassCard>
            <GlassCard style={styles.infoItem}>
              <Users size={18} color={Colors.green} />
              <Text style={styles.infoValue}>{trip.seats}</Text>
              <Text style={styles.infoLabel}>place{trip.seats > 1 ? 's' : ''}</Text>
            </GlassCard>
            <GlassCard style={styles.infoItem}>
              <Coins size={18} color={Colors.orange} />
              <Text style={[styles.infoValue, { color: Colors.primary }]}>{trip.price_fcfa.toLocaleString()}</Text>
              <Text style={styles.infoLabel}>FCFA</Text>
            </GlassCard>
          </View>

          <GlassCard variant="accent" style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <Text style={styles.driverSectionTitle}>Conducteur</Text>
            </View>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatarWrap}>
                <Image source={{ uri: driverAvatar }} style={styles.driverAvatar} />
                {isVerified && (
                  <View style={styles.verifiedIcon}>
                    <BadgeCheck size={14} color={Colors.primary} />
                  </View>
                )}
              </View>
              <View style={styles.driverInfo}>
                <View style={styles.driverNameRow}>
                  <Text style={styles.driverName}>{driverName}</Text>
                  {isVerified && (
                    <View style={styles.verifiedTag}>
                      <Shield size={10} color={Colors.green} />
                      <Text style={styles.verifiedTagText}>Vérifié</Text>
                    </View>
                  )}
                </View>
                <View style={styles.driverStats}>
                  <Star size={12} color={Colors.orange} fill={Colors.orange} />
                  <Text style={styles.driverRating}>{driverRating}</Text>
                  <Text style={styles.driverDot}>·</Text>
                  <Car size={12} color={Colors.textMuted} />
                  <Text style={styles.driverTrips}>{driverTrips} trajets</Text>
                </View>
              </View>
            </View>
          </GlassCard>

          {trip.comment ? (
            <GlassCard style={styles.commentsCard}>
              <Text style={styles.commentsTitle}>Commentaires du conducteur</Text>
              <Text style={styles.commentsText}>{trip.comment}</Text>
            </GlassCard>
          ) : null}

          <View style={styles.actionButtons}>
            {existingBooking ? (
              /* Already booked → go to bookings tab */
              <Pressable
                onPress={() => { router.back(); router.push('/(tabs)/bookings'); }}
                style={[styles.contactButton]}
              >
                <LinearGradient
                  colors={[Colors.green, Colors.greenDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionGradient}
                >
                  <Car size={18} color={Colors.white} />
                  <Text style={styles.actionText}>✅ Réservé — Voir mes réservations</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleContact}
                style={[styles.contactButton, (bookMutation.isPending || trip.user_id === userId || trip.seats <= 0) && { opacity: 0.7 }]}
                disabled={bookMutation.isPending || trip.user_id === userId || trip.seats <= 0}
              >
                <LinearGradient
                  colors={trip.user_id === userId ? [Colors.textMuted, Colors.textMuted] : trip.seats <= 0 ? [Colors.textMuted, Colors.textMuted] : [Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionGradient}
                >
                  <Car size={18} color={Colors.white} />
                  <Text style={styles.actionText}>
                    {trip.user_id === userId ? 'Votre trajet' : trip.seats <= 0 ? 'Complet' : bookMutation.isPending ? 'Réservation...' : 'Réserver cette place'}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
            <Pressable onPress={handlePayment} style={styles.paymentButton}>
              <LinearGradient
                colors={['#FF9933', '#E68A2E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGradient}
              >
                <Phone size={18} color={Colors.white} />
                <Text style={styles.actionText}>Orange Money</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
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
  closeRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  typeBadgeRow: {
    marginBottom: 14,
  },
  typeBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
  },
  typeBadgeWarm: {
    backgroundColor: 'rgba(255, 153, 51, 0.12)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  typeBadgeTextWarm: {
    color: Colors.orange,
  },
  routeCard: {
    marginBottom: 14,
  },
  routeMain: {
    flexDirection: 'row' as const,
    gap: 14,
  },
  routeLeft: {
    alignItems: 'center' as const,
    width: 20,
  },
  routeDot: {
    width: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLineVertical: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    marginVertical: 4,
  },
  routeDetails: {
    flex: 1,
    gap: 20,
  },
  routePoint: {},
  routeLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 3,
  },
  routePlace: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  infoGrid: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 14,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 14,
    gap: 6,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  driverCard: {
    marginBottom: 14,
  },
  driverHeader: {
    marginBottom: 10,
  },
  driverSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  driverRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  driverAvatarWrap: {
    position: 'relative' as const,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(66, 165, 245, 0.35)',
  },
  verifiedIcon: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 2,
  },
  driverInfo: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  verifiedTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 168, 107, 0.12)',
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.green,
  },
  driverStats: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 4,
  },
  driverRating: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.orange,
  },
  driverDot: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  driverTrips: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  commentsCard: {
    marginBottom: 14,
  },
  commentsTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  commentsText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 4,
  },
  contactButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden' as const,
  },
  paymentButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden' as const,
  },
  actionGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  errorCard: {
    margin: 16,
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  backLink: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
