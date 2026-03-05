import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Clock, Users, Star, BadgeCheck, ArrowRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';
import { Trip } from '@/types';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

export default React.memo(function TripCard({ trip, onPress }: TripCardProps) {
  const isInterville = trip.type === 'interville';

  return (
    <GlassCard
      onPress={onPress}
      variant={isInterville ? 'warm' : 'accent'}
      style={styles.card}
    >
      <View style={styles.typeTag}>
        <Text style={[styles.typeText, isInterville && styles.typeTextWarm]}>
          {isInterville ? 'INTERVILLE' : 'URBAIN'}
        </Text>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{trip.departure}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <ArrowRight size={14} color={Colors.textMuted} />
            <View style={styles.routeLine} />
          </View>
          <View style={styles.locationRow}>
            <MapPin size={14} color={isInterville ? Colors.orange : Colors.green} />
            <Text style={styles.locationText} numberOfLines={1}>{trip.arrival}</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>{trip.price.toLocaleString()}</Text>
          <Text style={styles.priceCurrency}>FCFA</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Clock size={12} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{trip.date.slice(5)} · {trip.time}</Text>
        </View>
        <View style={styles.detailItem}>
          <Users size={12} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{trip.seatsAvailable} place{trip.seatsAvailable > 1 ? 's' : ''}</Text>
        </View>
      </View>

      <View style={styles.driverRow}>
        <Image source={{ uri: trip.driverAvatar }} style={styles.avatar} />
        <View style={styles.driverInfo}>
          <View style={styles.driverNameRow}>
            <Text style={styles.driverName}>{trip.driverName}</Text>
            {trip.verified && <BadgeCheck size={14} color={Colors.primary} />}
          </View>
          <View style={styles.ratingRow}>
            <Star size={11} color={Colors.orange} fill={Colors.orange} />
            <Text style={styles.ratingText}>{trip.driverRating} · {trip.driverTrips} trajets</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  typeTag: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
    marginBottom: 10,
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
    marginBottom: 12,
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
    fontSize: 15,
    fontWeight: '600' as const,
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
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  priceCurrency: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  detailsRow: {
    flexDirection: 'row' as const,
    gap: 16,
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
  },
  driverRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(66, 165, 245, 0.35)',
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
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    marginTop: 1,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
