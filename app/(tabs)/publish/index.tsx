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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Car, MapPin, Calendar, Users, Coins, MessageSquare, ArrowLeftRight, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
import { TripType } from '@/types';

export default function PublishScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createTripMutation, isPublishing } = useApp();

  const [tripType, setTripType] = useState<TripType>('urbain');
  const [departure, setDeparture] = useState<string>('');
  const [arrival, setArrival] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [dateSet, setDateSet] = useState<boolean>(false);
  const [timeSet, setTimeSet] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [seats, setSeats] = useState<number>(3);
  const [price, setPrice] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [dateText, setDateText] = useState<string>('');
  const [timeText, setTimeText] = useState<string>('');

  const suggestedPrice = tripType === 'interville' ? '5 000' : '500';

  const formatDateDisplay = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatTimeDisplay = (d: Date) =>
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const formatDateForDB = (d: Date) => d.toISOString().split('T')[0];
  const formatTimeForDB = (d: Date) => d.toTimeString().slice(0, 5);

  const handleDatePress = useCallback(() => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDatePicker(true);
  }, []);

  const handleTimePress = useCallback(() => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTimePicker(true);
  }, []);

  const handlePublish = useCallback(() => {
    let tripDate: string;
    let tripTime: string;

    if (Platform.OS === 'web') {
      tripDate = dateText.trim();
      tripTime = timeText.trim();
    } else {
      tripDate = dateSet ? formatDateForDB(selectedDate) : '';
      tripTime = timeSet ? formatTimeForDB(selectedTime) : '';
    }

    if (!departure.trim() || !arrival.trim() || !tripDate || !tripTime) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const priceNum = parseInt(price.replace(/\s/g, ''), 10) || 0;

    createTripMutation.mutate(
      {
        type: tripType,
        departure: departure.trim(),
        arrival: arrival.trim(),
        trip_date: tripDate,
        trip_time: tripTime,
        seats: seats,
        price_fcfa: priceNum,
        comment: comments.trim() || null,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Trajet publié !',
            'Votre trajet est maintenant visible par les passagers.',
            [{ text: 'OK', onPress: () => router.navigate('/') }]
          );
          setDeparture('');
          setArrival('');
          setDateSet(false);
          setTimeSet(false);
          setDateText('');
          setTimeText('');
          setSeats(3);
          setPrice('');
          setComments('');
          console.log('[PublishScreen] Trip published successfully');
        },
        onError: (error: Error) => {
          Alert.alert('Erreur', error.message || 'Impossible de publier le trajet.');
          console.log('[PublishScreen] Publish error:', error.message);
        },
      }
    );
  }, [tripType, departure, arrival, selectedDate, selectedTime, dateSet, timeSet, seats, price, comments, createTripMutation, router, dateText, timeText]);

  let DateTimePickerNative: any = null;
  if (Platform.OS !== 'web') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      DateTimePickerNative = require('@react-native-community/datetimepicker').default;
    } catch (err) {
      console.log('[PublishScreen] DateTimePicker not available', err);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(187, 222, 251, 0.25)', 'transparent']}
        style={styles.topGlow}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
                {Platform.OS === 'web' ? (
                  <TextInput
                    style={styles.input}
                    value={dateText}
                    onChangeText={setDateText}
                    placeholder="2026-03-05"
                    placeholderTextColor={Colors.textMuted}
                  />
                ) : (
                  <Pressable onPress={handleDatePress} style={styles.pickerButton}>
                    <Calendar size={16} color={Colors.primary} />
                    <Text style={[styles.pickerText, !dateSet && styles.pickerPlaceholder]}>
                      {dateSet ? formatDateDisplay(selectedDate) : 'Choisir une date'}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Heure</Text>
                {Platform.OS === 'web' ? (
                  <TextInput
                    style={styles.input}
                    value={timeText}
                    onChangeText={setTimeText}
                    placeholder="07:30"
                    placeholderTextColor={Colors.textMuted}
                  />
                ) : (
                  <Pressable onPress={handleTimePress} style={styles.pickerButton}>
                    <Clock size={16} color={Colors.primary} />
                    <Text style={[styles.pickerText, !timeSet && styles.pickerPlaceholder]}>
                      {timeSet ? formatTimeDisplay(selectedTime) : "Choisir l'heure"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {Platform.OS !== 'web' && showDatePicker && DateTimePickerNative && (
              <DateTimePickerNative
                value={selectedDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(_event: any, date?: Date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setSelectedDate(date);
                    setDateSet(true);
                  }
                }}
              />
            )}

            {Platform.OS !== 'web' && showTimePicker && DateTimePickerNative && (
              <DateTimePickerNative
                value={selectedTime}
                mode="time"
                display="default"
                onChange={(_event: any, date?: Date) => {
                  setShowTimePicker(false);
                  if (date) {
                    setSelectedTime(date);
                    setTimeSet(true);
                  }
                }}
              />
            )}
          </GlassCard>

          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Détails</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Places disponibles</Text>
              <View style={styles.seatsRow}>
                {[1, 2, 3].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => {
                      setSeats(num);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.seatButton,
                      seats === num && styles.seatButtonActive,
                    ]}
                  >
                    <Text style={[
                      styles.seatButtonText,
                      seats === num && styles.seatButtonTextActive,
                    ]}>
                      {num}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contribution FCFA</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="number-pad"
                  placeholder={suggestedPrice}
                  placeholderTextColor={Colors.textMuted}
                />
                <View style={styles.fcfaLabel}>
                  <Text style={styles.fcfaText}>FCFA</Text>
                </View>
              </View>
            </View>

            <View style={styles.suggestRow}>
              <Coins size={12} color={Colors.orange} />
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

          <Pressable onPress={handlePublish} style={[styles.publishButton, isPublishing && { opacity: 0.7 }]} disabled={isPublishing}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.publishGradient}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Car size={18} color={Colors.white} />
              )}
              <Text style={styles.publishText}>{isPublishing ? 'Publication...' : 'Publier le trajet'}</Text>
            </LinearGradient>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.50)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.12)',
    alignItems: 'center' as const,
  },
  typeChipActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderColor: Colors.primary,
  },
  typeChipActiveWarm: {
    backgroundColor: 'rgba(255, 153, 51, 0.15)',
    borderColor: Colors.orange,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.text,
    fontWeight: '700' as const,
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
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.12)',
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
  pickerButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  pickerPlaceholder: {
    color: Colors.textMuted,
  },
  seatsRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  seatButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    borderWidth: 2,
    borderColor: 'rgba(33, 150, 243, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  seatButtonActive: {
    backgroundColor: 'rgba(0, 191, 255, 0.12)',
    borderColor: '#00BFFF',
  },
  seatButtonText: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.textSecondary,
  },
  seatButtonTextActive: {
    color: '#00BFFF',
  },
  priceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  fcfaLabel: {
    backgroundColor: 'rgba(33, 150, 243, 0.10)',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
  },
  fcfaText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
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
    color: Colors.orange,
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
