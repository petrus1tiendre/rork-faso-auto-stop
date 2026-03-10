import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Clock, Users, Star, BadgeCheck, ArrowRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';
import { Trip } from '@/types';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
  onBook?: () => void;
}

/** Get 1–2 initials from a full name */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Format price with space thousands separator: 5000 → "5 000" */
function formatPrice(n: number): string {
  return n.toLocaleString('fr-FR');
}

/** Format date to French long format: "Lundi 9 mars 2026" */
function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default React.memo(function TripCard({ trip, onPress, onBook }: TripCardProps) {
  const isInterville = trip.type === 'interville';
  const driverName = trip.profiles?.full_name ?? 'Conducteur';
  const driverAvatar = trip.profiles?.avatar_url ?? null;
  const driverRating = trip.profiles?.rating ?? 5.0;
  const driverTrips = trip.profiles?.total_trips ?? 0;
  const isVerified = trip.profiles?.is_verified ?? false;

  const dateDisplay = formatFrenchDate(trip.trip_date);
  const timeDisplay = trip.trip_time ? trip.trip_time.slice(0, 5) : '';
  const priceDisplay = formatPrice(trip.price_fcfa);
  const seatsLabel = trip.seats === 1 ? '1 place restante' : `${trip.seats} places restantes`;

  return (
    <GlassCard
      onPress={onPress}
      variant={isInterville ? 'warm' : 'accent'}
      style={styles.card}
    >
      {/* Type tag */}
      <View style={[styles.typeTag, isInterville && styles.typeTagWarm]}>
        <Text style={[styles.typeText, isInterville && styles.typeTextWarm]}>
          {isInterville ? '🛣 INTERVILLE' : '🏙 URBAIN'}
        </Text>
      </View>

      {/* Route + Price */}
      <View style={styles.routeRow}>
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <MapPin size={15} color={Colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{trip.departure}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <ArrowRight size={14} color={Colors.textMuted} />
            <View style={styles.routeLine} />
          </View>
          <View style={styles.locationRow}>
            <MapPin size={15} color={isInterville ? Colors.orange : Colors.green} />
            <Text style={styles.locationText} numberOfLines={1}>{trip.arrival}</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceAmount, isInterville && styles.priceAmountWarm]}>
            {priceDisplay}
          </Text>
          <Text style={styles.priceCurrency}>FCFA</Text>
        </View>
      </View>

      {/* Date, time, seats */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Clock size={13} color={Colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{dateDisplay}</Text>
        </View>
        <View style={styles.detailItem}>
          <Clock size={13} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{timeDisplay}</Text>
        </View>
        <View style={styles.detailItem}>
          <Users size={13} color={Colors.green} />
          <Text style={[styles.detailText, styles.seatsText]}>{seatsLabel}</Text>
        </View>
      </View>

      {/* Driver row */}
      <View style={styles.driverRow}>
        {/* Avatar or initials */}
        {driverAvatar ? (
          <Image source={{ uri: driverAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.initialsCircle, isInterville && styles.initialsCircleWarm]}>
            <Text style={styles.initialsText}>{getInitials(driverName)}</Text>
          </View>
        )}

        <View style={styles.driverInfo}>
          <View style={styles.driverNameRow}>
            <Text style={styles.driverName}>{driverName}</Text>
            {isVerified && <BadgeCheck size={14} color={Colors.primary} />}
          </View>
          <View style={styles.ratingRow}>
            <Star size={11} color={Colors.orange} fill={Colors.orange} />
            <Text style={styles.ratingText}>{driverRating.toFixed(1)} · {driverTrips} trajets</Text>
          </View>
        </View>

        {/* Réserver button */}
        {onBook && (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onBook(); }}
            style={[styles.bookButton, isInterville && styles.bookButtonWarm]}
          >
            <Text style={styles.bookButtonText}>Réserver</Text>
          </Pressable>
        )}
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  typeTag: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
    marginBottom: 10,
  },
  typeTagWarm: {
    backgroundColor: 'rgba(255, 153, 51, 0.12)',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 1,
  },
  typeTextWarm: {
    color: Colors.orange,
  },
  routeRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  routeInfo: {
    flex: 1,
    marginRight: 12,
  },
  locationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  arrowContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingLeft: 2,
    paddingVertical: 4,
  },
  routeLine: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(33, 150, 243, 0.10)',
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: 'flex-end' as const,
    minWidth: 70,
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  priceAmountWarm: {
    color: Colors.orange,
  },
  priceCurrency: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  detailsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33, 150, 243, 0.08)',
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  seatsText: {
    color: Colors.green,
    fontWeight: '600' as const,
  },
  driverRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(66, 165, 245, 0.35)',
  },
  initialsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(33, 150, 243, 0.25)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  initialsCircleWarm: {
    backgroundColor: 'rgba(255, 153, 51, 0.15)',
    borderColor: 'rgba(255, 153, 51, 0.30)',
  },
  initialsText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  driverInfo: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    minHeight: 38,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bookButtonWarm: {
    backgroundColor: Colors.orange,
  },
  bookButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
