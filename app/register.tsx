import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, UserPlus, ArrowLeft } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        throw new Error('Veuillez remplir tous les champs.');
      }
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName.trim(),
            phone: '',
            avatar_url: null,
            is_verified: false,
            rating: 5.0,
            total_trips: 0,
          });

        // Profile creation error is non-fatal, user can update later

        if (!data.session) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (!signInError) {
            return signInData;
          }
        }
      }

      return data;
    },
    onError: (error: Error) => {
      Alert.alert('Erreur d\'inscription', error.message);
    },
  });

  const { mutate: registerMutate } = registerMutation;

  const handleRegister = useCallback(() => {
    registerMutate();
  }, [registerMutate]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(66, 165, 245, 0.18)', 'transparent']}
        style={styles.topGlow}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.appName}>Faso Auto-stop</Text>
            <Text style={styles.tagline}>Rejoignez la communauté</Text>
          </View>

          <GlassCard variant="accent" style={styles.formCard}>
            <Text style={styles.formTitle}>Créer un compte</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <User size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nom complet"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  testID="register-name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Mail size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Adresse email"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="register-email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Lock size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mot de passe (min. 6 caractères)"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  testID="register-password"
                />
              </View>
            </View>

            <Pressable
              onPress={handleRegister}
              style={[styles.submitButton, registerMutation.isPending && { opacity: 0.7 }]}
              disabled={registerMutation.isPending}
              testID="register-submit"
            >
              <LinearGradient
                colors={[Colors.green, Colors.greenDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {registerMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <UserPlus size={18} color={Colors.white} />
                )}
                <Text style={styles.submitText}>
                  {registerMutation.isPending ? 'Création...' : 'Créer mon compte'}
                </Text>
              </LinearGradient>
            </Pressable>
          </GlassCard>

          <Pressable
            onPress={() => router.back()}
            style={styles.switchButton}
            testID="go-login"
          >
            <Text style={styles.switchText}>Déjà un compte ? <Text style={styles.switchBold}>Se connecter</Text></Text>
          </Pressable>
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
  flex: {
    flex: 1,
  },
  topGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 24,
  },
  backText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center' as const,
  },
  formCard: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden' as const,
  },
  submitGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  switchButton: {
    alignItems: 'center' as const,
    paddingVertical: 14,
  },
  switchText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  switchBold: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
