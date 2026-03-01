import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Car, MapPin, Calendar, Users, Coins, MessageSquare, ArrowLeftRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
import { Trip, TripType } from '@/types';


export default function PublishScreen() {
  const insets = useSafeAreaInsets();
  const { addTrip, profile } = useApp();

  const [tripType, setTripType] = useState<TripType>('urbain');
  const [departure, setDeparture] = useState<string>('');
  const [arrival, setArrival] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [seats, setSeats] = useState<string>('3');
  const [price, setPrice] = useState<string>('');
  const [comments, setComments] = useState<string>('');

  const suggestedPrice = tripType === 'interville' ? '5 000' : '500';

  const handlePublish = useCallback(() => {
    if (!departure.trim() || !arrival.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const newTrip: Trip = {
      id: Date.now().toString(),
      type: tripType,
      departure: departure.trim(),
      arrival: arrival.trim(),
      date: date.trim(),
      time: time.trim(),
      seats: parseInt(seats, 10) || 3,
      seatsAvailable: parseInt(seats, 10) || 3,
      price: parseInt(price.replace(/\s/g, ''), 10) || 0,
      driverName: profile.name,
      driverAvatar: profile.avatar,
      driverRating: profile.rating,
      driverTrips: profile.tripsCompleted,
      verified: profile.verified,
      comments: comments.trim(),
      createdAt: new Date().toISOString(),
    };

    addTrip(newTrip);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Trajet publié !', 'Votre trajet est maintenant visible par les passagers.');

    setDeparture('');
    setArrival('');
    setDate('');
    setTime('');
    setSeats('3');
    setPrice('');
    setComments('');

    console.log('[PublishScreen] Trip published:', newTrip.id);
  }, [tripType, departure, arrival, date, time, seats, price, comments, addTrip, profile]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0A0E1A', '#0D1525', '#0A0E1A']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255, 153, 51, 0.06)', 'transparent']}
        style={styles.topGlow}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Publier un trajet</Text>
        <Text style={styles.subtitle}>Proposez votre trajet et partagez les frais</Text>

        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Car size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Type de trajet</Text>
          </View>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => { setTripType('urbain'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.typeChip, tripType === 'urbain' && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, tripType === 'urbain' && styles.typeChipTextActive]}>
                Urbain Ouaga
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setTripType('interville'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.typeChip, tripType === 'interville' && styles.typeChipActiveWarm]}
            >
              <Text style={[styles.typeChipText, tripType === 'interville' && styles.typeChipTextActive]}>
                Ouaga ↔ Bobo
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Itinéraire</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Départ</Text>
            <TextInput
              style={styles.input}
              value={departure}
              onChangeText={setDeparture}
              placeholder={tripType === 'urbain' ? 'Ex: Ouaga 2000' : 'Ex: Ouagadougou'}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.swapRow}>
            <ArrowLeftRight size={16} color={Colors.textMuted} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Arrivée</Text>
            <TextInput
              style={styles.input}
              value={arrival}
              onChangeText={setArrival}
              placeholder={tripType === 'urbain' ? 'Ex: Tampouy' : 'Ex: Bobo-Dioulasso'}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Date et heure</Text>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="2026-03-01"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Heure</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="07:30"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Détails</Text>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Places disponibles</Text>
              <TextInput
                style={styles.input}
                value={seats}
                onChangeText={setSeats}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Contribution FCFA</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                placeholder={suggestedPrice}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.suggestRow}>
            <Coins size={12} color={Colors.accent} />
            <Text style={styles.suggestText}>
              Contribution suggérée : {suggestedPrice} FCFA/personne
            </Text>
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Commentaires</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={comments}
            onChangeText={setComments}
            placeholder="Modèle de voiture, bagages acceptés, arrêts..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </GlassCard>

        <Pressable onPress={handlePublish} style={styles.publishButton}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.publishGradient}
          >
            <Car size={18} color={Colors.white} />
            <Text style={styles.publishText}>Publier le trajet</Text>
          </LinearGradient>
        </Pressable>

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
    marginBottom: 20,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  typeRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center' as const,
  },
  typeChipActive: {
    backgroundColor: 'rgba(0, 191, 255, 0.2)',
    borderColor: Colors.primary,
  },
  typeChipActiveWarm: {
    backgroundColor: 'rgba(255, 153, 51, 0.2)',
    borderColor: Colors.accent,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.white,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  swapRow: {
    alignItems: 'center' as const,
    paddingVertical: 4,
  },
  rowInputs: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  suggestRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  suggestText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  publishButton: {
    marginTop: 6,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  publishGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  publishText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
