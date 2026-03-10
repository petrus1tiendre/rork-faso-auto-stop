import React, { useState } from 'react';
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
import { Shield, Phone, ArrowLeft, Send, CheckCircle } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';

type Step = 'phone' | 'otp';

export default function ProfileVerificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, session, refetchProfile } = useApp();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState<string>(profile?.phone ?? '');
  const [otp, setOtp] = useState<string>('');
  const [devOtp, setDevOtp] = useState<string | null>(null); // shown in dev for testing

  // Step 1: Request OTP
  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      const rawPhone = phone.trim().replace(/\s/g, '');
      if (!rawPhone) throw new Error('Veuillez entrer votre numéro de téléphone.');
      if (rawPhone.length < 8) throw new Error('Numéro de téléphone invalide.');

      const fullPhone = rawPhone.startsWith('+') ? rawPhone : '+226' + rawPhone;

      const { data, error } = await supabase.rpc('request_phone_otp', {
        p_phone: fullPhone,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return { phone: fullPhone, otp: data?.otp as string | undefined };
    },
    onSuccess: (result) => {
      setPhone(result.phone);
      setStep('otp');
      // In dev, show OTP in an Alert so tester can use it
      if (result.otp) {
        setDevOtp(result.otp);
        Alert.alert(
          '📱 Code OTP (Mode dev)',
          `Votre code est : ${result.otp}\n\n(En production ce code sera envoyé par SMS)`,
          [{ text: 'Compris' }]
        );
      } else {
        Alert.alert('Code envoyé', `Un code à 6 chiffres a été envoyé au ${result.phone}`);
      }
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
  });

  // Step 2: Verify OTP
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const code = otp.trim();
      if (code.length !== 6) throw new Error('Le code doit contenir 6 chiffres.');

      const { data, error } = await supabase.rpc('verify_phone_otp', {
        p_phone: phone,
        p_otp: code,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      refetchProfile();
      Alert.alert(
        '✅ Numéro vérifié !',
        'Votre numéro de téléphone a été vérifié avec succès. Votre profil est maintenant vérifié.',
        [{ text: 'Excellent !', onPress: () => router.back() }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Code incorrect', error.message);
    },
  });

  const handleRequestOtp = () => requestOtpMutation.mutate();
  const handleVerifyOtp = () => verifyOtpMutation.mutate();
  const handleResend = () => {
    setOtp('');
    requestOtpMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>

          <View style={styles.header}>
            <Shield size={36} color={Colors.primary} />
            <Text style={styles.title}>Vérification du numéro</Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Entrez votre numéro pour recevoir un code de vérification'
                : `Code envoyé au ${phone}`}
            </Text>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepDotText}>1</Text>
            </View>
            <View style={[styles.stepLine, step === 'otp' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step !== 'otp' && styles.stepDotTextInactive]}>2</Text>
            </View>
          </View>
          <View style={styles.stepLabelRow}>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>Numéro</Text>
            <Text style={[styles.stepLabel, step === 'otp' && styles.stepLabelActive]}>Code OTP</Text>
          </View>

          <GlassCard variant="accent" style={styles.formCard}>
            {step === 'phone' ? (
              <>
                <Text style={styles.inputLabel}>Numéro de téléphone (+226)</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.prefixText}>🇧🇫 +226</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone.startsWith('+226') ? phone.replace('+226', '') : phone}
                    onChangeText={(v) => setPhone(v.replace(/\s/g, ''))}
                    placeholder="70 00 00 00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus
                  />
                </View>
                <Text style={styles.hint}>
                  Entrez votre numéro sans l'indicatif pays
                </Text>

                <Pressable
                  onPress={handleRequestOtp}
                  style={[styles.primaryButton, requestOtpMutation.isPending && { opacity: 0.7 }]}
                  disabled={requestOtpMutation.isPending}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {requestOtpMutation.isPending ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Send size={18} color={Colors.white} />
                    )}
                    <Text style={styles.buttonText}>
                      {requestOtpMutation.isPending ? 'Envoi en cours...' : 'Envoyer le code'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Code à 6 chiffres</Text>
                <TextInput
                  style={[styles.otpInput]}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  textAlign="center"
                />

                {devOtp && (
                  <View style={styles.devBanner}>
                    <Text style={styles.devText}>🔧 Mode dev — Code : {devOtp}</Text>
                  </View>
                )}

                <Pressable
                  onPress={handleVerifyOtp}
                  style={[styles.primaryButton, (verifyOtpMutation.isPending || otp.length !== 6) && { opacity: 0.7 }]}
                  disabled={verifyOtpMutation.isPending || otp.length !== 6}
                >
                  <LinearGradient
                    colors={[Colors.green, Colors.greenDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {verifyOtpMutation.isPending ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <CheckCircle size={18} color={Colors.white} />
                    )}
                    <Text style={styles.buttonText}>
                      {verifyOtpMutation.isPending ? 'Vérification...' : 'Vérifier le code'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={handleResend} style={styles.resendButton} disabled={requestOtpMutation.isPending}>
                  <Text style={styles.resendText}>
                    {requestOtpMutation.isPending ? 'Renvoi en cours...' : 'Renvoyer le code'}
                  </Text>
                </Pressable>

                <Pressable onPress={() => { setStep('phone'); setOtp(''); setDevOtp(null); }} style={styles.changePhone}>
                  <Text style={styles.changePhoneText}>Changer de numéro</Text>
                </Pressable>
              </>
            )}
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  backButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 24 },
  backText: { fontSize: 15, color: Colors.text, fontWeight: '600' as const },
  header: { alignItems: 'center' as const, marginBottom: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const, lineHeight: 20 },

  // Step indicator
  stepRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 4 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(33,150,243,0.15)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotText: { fontSize: 14, fontWeight: '700' as const, color: Colors.white },
  stepDotTextInactive: { color: Colors.textMuted },
  stepLine: { width: 60, height: 2, backgroundColor: 'rgba(33,150,243,0.15)', marginHorizontal: 8 },
  stepLineActive: { backgroundColor: Colors.primary },
  stepLabelRow: {
    flexDirection: 'row' as const, justifyContent: 'center' as const,
    gap: 80, marginBottom: 24,
  },
  stepLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' as const },
  stepLabelActive: { color: Colors.primary },

  formCard: { marginBottom: 20 },
  inputLabel: {
    fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary,
    marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5,
  },

  // Phone input
  phoneRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 8 },
  prefixBox: {
    backgroundColor: 'rgba(33,150,243,0.10)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 14,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  prefixText: { fontSize: 15, fontWeight: '700' as const, color: Colors.primary },
  phoneInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 18, fontWeight: '600' as const, color: Colors.text, letterSpacing: 2,
  },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: 16 },

  // OTP input
  otpInput: {
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 16,
    fontSize: 28, fontWeight: '800' as const, color: Colors.text,
    letterSpacing: 10, marginBottom: 12,
  },

  devBanner: {
    backgroundColor: 'rgba(255,153,0,0.12)',
    borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,153,0,0.3)',
  },
  devText: { fontSize: 13, color: Colors.orange, textAlign: 'center' as const, fontWeight: '600' as const },

  primaryButton: { borderRadius: 14, overflow: 'hidden' as const, marginTop: 4 },
  buttonGradient: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8, paddingVertical: 15, borderRadius: 14,
  },
  buttonText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },

  resendButton: { alignItems: 'center' as const, paddingVertical: 12 },
  resendText: { fontSize: 14, color: Colors.primary, fontWeight: '600' as const },
  changePhone: { alignItems: 'center' as const, paddingBottom: 4 },
  changePhoneText: { fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' as const },
});
