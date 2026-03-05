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
import { Shield, User, Phone, ArrowLeft, Check } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';

export default function ProfileVerificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, session, refetchProfile } = useApp();
  const [fullName, setFullName] = useState<string>(profile?.full_name ?? '');
  const [phone, setPhone] = useState<string>(profile?.phone ?? '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error('Non connecté');
      if (!fullName.trim()) throw new Error('Le nom est requis');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq('id', session.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchProfile();
      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert('Erreur', error.message);
    },
  });

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
            <Shield size={32} color={Colors.primary} />
            <Text style={styles.title}>Vérification du profil</Text>
            <Text style={styles.subtitle}>
              Complétez vos informations pour vérifier votre profil
            </Text>
          </View>

          <GlassCard variant="accent" style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom complet</Text>
              <View style={styles.inputRow}>
                <User size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Votre nom complet"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numéro de téléphone</Text>
              <View style={styles.inputRow}>
                <Phone size={18} color={Colors.textMuted} />
                <Text style={styles.prefix}>+226</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="70 00 00 00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <Pressable
              onPress={() => updateMutation.mutate()}
              style={[styles.submitButton, updateMutation.isPending && { opacity: 0.7 }]}
              disabled={updateMutation.isPending}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Check size={18} color={Colors.white} />
                )}
                <Text style={styles.submitText}>
                  {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </LinearGradient>
            </Pressable>
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
  header: { alignItems: 'center' as const, marginBottom: 28, gap: 8 },
  title: { fontSize: 24, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const },
  formCard: { marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: 'rgba(255,255,255,0.60)', borderWidth: 1, borderColor: 'rgba(33,150,243,0.12)', borderRadius: 12, paddingHorizontal: 14, gap: 10 },
  prefix: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: Colors.text },
  submitButton: { marginTop: 8, borderRadius: 14, overflow: 'hidden' as const },
  submitGradient: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 15, borderRadius: 14 },
  submitText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
});
