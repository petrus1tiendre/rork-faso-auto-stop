import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, CalendarCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';

export default function BookingConfirmedScreen() {
  const router = useRouter();
  const { departure, arrival, date, time, driverName } = useLocalSearchParams<{
    departure: string;
    arrival: string;
    date: string;
    time: string;
    driverName: string;
  }>();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <GlassCard variant="accent" style={styles.card}>
        <View style={styles.iconWrap}>
          <CheckCircle size={56} color={Colors.green} />
        </View>
        <Text style={styles.title}>Réservation confirmée !</Text>
        <Text style={styles.subtitle}>Votre place est réservée automatiquement.</Text>

        {(departure || arrival) ? (
          <View style={styles.details}>
            {departure ? <Text style={styles.detailText}>🚩 Départ : {departure}</Text> : null}
            {arrival ? <Text style={styles.detailText}>📍 Arrivée : {arrival}</Text> : null}
            {date ? <Text style={styles.detailText}>📅 Date : {date}</Text> : null}
            {time ? <Text style={styles.detailText}>🕐 Heure : {time}</Text> : null}
            {driverName ? <Text style={styles.detailText}>🚗 Conducteur : {driverName}</Text> : null}
          </View>
        ) : null}

        <Pressable
          onPress={() => { router.back(); router.push('/(tabs)/bookings'); }}
          style={styles.primaryBtn}
        >
          <CalendarCheck size={18} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Voir mes réservations</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Retour à l'accueil</Text>
        </Pressable>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24, backgroundColor: Colors.background },
  card: { width: '100%', alignItems: 'center' as const },
  iconWrap: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, textAlign: 'center' as const, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' as const, marginBottom: 20, lineHeight: 22 },
  details: { width: '100%', backgroundColor: 'rgba(33,150,243,0.06)', borderRadius: 12, padding: 14, gap: 8, marginBottom: 20 },
  detailText: { fontSize: 14, color: Colors.text, fontWeight: '500' as const },
  primaryBtn: {
    width: '100%', flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginBottom: 10,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  secondaryBtn: { width: '100%', alignItems: 'center' as const, paddingVertical: 12 },
  secondaryBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' as const },
});
