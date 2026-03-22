import React, { useState, useCallback, useMemo } from 'react';
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
import { Car, MapPin, Calendar, Users, MessageSquare, ArrowLeftRight, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
import DateTimeWheelModal from '@/components/DateTimeWheelModal';
import { TripType } from '@/types';

export default function PublishScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createTripMutation, isPublishing, profile } = useApp();
  const isVerified = profile?.is_verified ?? false;

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const suggestedPrice = tripType === 'interville' ? '5 000' : '500';

  const canPublish = useMemo(() => {
    return departure.trim().length > 0 && arrival.trim().length > 0 && dateSet && timeSet;
  }, [departure, arrival, dateSet, timeSet]);

  const formatDateDisplay = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatTimeDisplay = (d: Date) =>
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  // Fix: use local date components to avoid UTC timezone shift
  const formatDateForDB = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const formatTimeForDB = (d: Date) => {
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  };

  const handleDatePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDatePicker(true);
  }, []);

  const handleTimePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTimePicker(true);
  }, []);

  const handlePublish = useCallback(() => {
    if (!isVerified) {
      Alert.alert(
        '🔒 Vérification requise',
        'Vous devez vérifier votre identité avant de publier un trajet.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Vérifier maintenant', onPress: () => router.push('/identity-verification') },
        ]
      );
      return;
    }
    const tripDate = dateSet ? formatDateForDB(selectedDate) : '';
    const tripTime = timeSet ? formatTimeForDB(selectedTime) : '';

    const newErrors: Record<string, string> = {};
    if (!departure.trim()) newErrors.departure = 'Le lieu de départ est requis';
    if (!arrival.trim()) newErrors.arrival = "Le lieu d'arrivée est requis";
    if (!tripDate) newErrors.date = 'La date est requise';
    if (!tripTime) newErrors.time = "L'heure est requise";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Trajet publié !',
            'Votre trajet est maintenant visible par les passagers.',
            [{ text: 'OK', onPress: () => router.navigate('/') }]
          );
          setDeparture('');
          setArrival('');
          setDateSet(false);
          setTimeSet(false);
          setSeats(3);
          setPrice('');
          setComments('');
        },
        onError: (error: Error) => {
          Alert.alert('Erreur', error.message || 'Impossible de publier le trajet.');
        },
      }
    );
  }, [tripType, departure, arrival, selectedDate, selectedTime, dateSet, timeSet, seats, price, comments, createTripMutation, router]);

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

          {!isVerified && (
            <Pressable
              onPress={() => router.push('/identity-verification')}
              style={styles.verifyBanner}
            >
              <Text style={styles.verifyBannerText}>🔒 Vérifiez votre identité pour publier un trajet →</Text>
            </Pressable>
          )}

          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Car size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Type de trajet</Text>
            </View>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => { setTripType('urbain'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.typeChip, tripType === 'urbain' && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, tripType === 'urbain' && styles.typeChipTextActive]}>
                  Urbain Ouaga
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setTripType('interville'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
              <Text style={styles.inputLabel}>
                Départ <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.departure && styles.inputError]}
                value={departure}
                onChangeText={(text) => {
                  setDeparture(text);
                  if (errors.departure) setErrors((e) => { const { departure: _, ...rest } = e; return rest; });
                }}
                placeholder={tripType === 'urbain' ? 'Ex: Ouaga 2000' : 'Ex: Ouagadougou'}
                placeholderTextColor={Colors.textMuted}
              />
              {errors.departure && <Text style={styles.errorText}>{errors.departure}</Text>}
            </View>

            <View style={styles.swapRow}>
              <ArrowLeftRight size={16} color={Colors.textMuted} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Arrivée <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.arrival && styles.inputError]}
                value={arrival}
                onChangeText={(text) => {
                  setArrival(text);
                  if (errors.arrival) setErrors((e) => { const { arrival: _, ...rest } = e; return rest; });
                }}
                placeholder={tripType === 'urbain' ? 'Ex: Tampouy' : 'Ex: Bobo-Dioulasso'}
                placeholderTextColor={Colors.textMuted}
              />
              {errors.arrival && <Text style={styles.errorText}>{errors.arrival}</Text>}
            </View>
          </GlassCard>

          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Date et heure</Text>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Date <Text style={styles.required}>*</Text></Text>
                <Pressable onPress={handleDatePress} style={styles.pickerButton}>
                  <Calendar size={16} color={Colors.primary} />
                  <Text style={[styles.pickerText, !dateSet && styles.pickerPlaceholder]}>
                    {dateSet ? formatDateDisplay(selectedDate) : 'Choisir une date'}
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Heure <Text style={styles.required}>*</Text></Text>
                <Pressable onPress={handleTimePress} style={styles.pickerButton}>
                  <Clock size={16} color={Colors.primary} />
                  <Text style={[styles.pickerText, !timeSet && styles.pickerPlaceholder]}>
                    {timeSet ? formatTimeDisplay(selectedTime) : "Choisir l'heure"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Wheel modals — works on iOS, Android and Web */}
            <DateTimeWheelModal
              visible={showDatePicker}
              mode="date"
              value={selectedDate}
              minimumDate={new Date()}
              onConfirm={(date) => {
                setSelectedDate(date);
                setDateSet(true);
                setShowDatePicker(false);
              }}
              onCancel={() => setShowDatePicker(false)}
            />
            <DateTimeWheelModal
              visible={showTimePicker}
              mode="time"
              value={selectedTime}
              onConfirm={(date) => {
                setSelectedTime(date);
                setTimeSet(true);
                setShowTimePicker(false);
              }}
              onCancel={() => setShowTimePicker(false)}
            />
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
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              numberOfLines={4}
              textAlignVertical="top"
              scrollEnabled={false}
              blurOnSubmit={false}
              returnKeyType="default"
            />
          </GlassCard>

          <Pressable
            onPress={handlePublish}
            style={[styles.publishButton, (!canPublish || isPublishing) && { opacity: 0.5 }]}
            disabled={!canPublish || isPublishing}
          >
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
    minHeight: 100,
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
  required: {
    color: Colors.danger,
  },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  errorText: {
    fontSize: 11,
    color: Colors.danger,
    marginTop: 4,
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
  verifyBanner: {
    backgroundColor: 'rgba(255,153,51,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,153,51,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  verifyBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.orange,
    textAlign: 'center' as const,
  },
});
