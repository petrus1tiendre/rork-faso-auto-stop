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
import { Mail, Lock, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';

import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Votre adresse email n\'a pas encore été confirmée. Vérifiez votre boîte mail.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
  }
  if (lower.includes('user not found')) {
    return 'Aucun compte trouvé avec cette adresse email.';
  }
  if (lower.includes('email rate limit exceeded')) {
    return 'Limite d\'envoi d\'emails atteinte. Réessayez plus tard.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
  }
  if (lower.includes('password') && lower.includes('weak')) {
    return 'Le mot de passe est trop faible. Choisissez un mot de passe plus sécurisé.';
  }
  if (lower.includes('signup is disabled')) {
    return 'Les inscriptions sont temporairement désactivées.';
  }
  return message;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !password.trim()) {
        throw new Error('Veuillez remplir tous les champs.');
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      const msg = translateAuthError(error.message);
      Alert.alert('Erreur de connexion', msg);
    },
  });

  const { mutate: loginMutate } = loginMutation;

  const handleLogin = useCallback(() => {
    loginMutate();
  }, [loginMutate]);

  const handleForgotPassword = useCallback(async () => {
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      Alert.alert(
        'Mot de passe oublié',
        'Saisissez d\'abord votre adresse email dans le champ ci-dessus, puis appuyez sur "Mot de passe oublié".'
      );
      return;
    }
    setResetLoading(true);
    // redirectTo points back to the app's reset-password screen (works on web + mobile deep link)
    let redirectTo = 'fasoautostop://reset-password';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const base = window.location.href.split('#')[0].split('?')[0];
      const pathParts = base.replace(/\/$/, '').split('/');
      pathParts[pathParts.length - 1] = 'reset-password';
      redirectTo = pathParts.join('/');
      console.log('[ForgotPassword] Web redirectTo:', redirectTo);
    }
    console.log('[ForgotPassword] redirectTo:', redirectTo);
    const { error } = await supabase.auth.resetPasswordForEmail(emailTrimmed, { redirectTo });
    setResetLoading(false);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert(
        'Email envoyé ✉️',
        `Un lien de réinitialisation a été envoyé à ${emailTrimmed}.\n\nVérifiez votre boîte mail (et vos spams).`
      );
    }
  }, [email]);

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
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.appName}>Faso Auto-stop</Text>
            <Text style={styles.tagline}>Partagez vos trajets, économisez ensemble</Text>
          </View>

          <GlassCard variant="accent" style={styles.formCard}>
            <Text style={styles.formTitle}>Connexion</Text>

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
                  testID="login-email"
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
                  placeholder="Mot de passe"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  testID="login-password"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                  style={styles.eyeButton}
                >
                  {showPassword
                    ? <EyeOff size={18} color={Colors.textMuted} />
                    : <Eye size={18} color={Colors.textMuted} />
                  }
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleForgotPassword}
              style={styles.forgotButton}
              disabled={resetLoading}
            >
              <Text style={styles.forgotText}>
                {resetLoading ? 'Envoi en cours...' : 'Mot de passe oublié ?'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleLogin}
              style={[styles.submitButton, loginMutation.isPending && { opacity: 0.7 }]}
              disabled={loginMutation.isPending}
              testID="login-submit"
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loginMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <LogIn size={18} color={Colors.white} />
                )}
                <Text style={styles.submitText}>
                  {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
                </Text>
              </LinearGradient>
            </Pressable>
          </GlassCard>

          <Pressable
            onPress={() => router.push('/register')}
            style={styles.switchButton}
            testID="go-register"
          >
            <UserPlus size={16} color={Colors.primary} />
            <Text style={styles.switchText}>Pas encore de compte ? <Text style={styles.switchBold}>Créer un compte</Text></Text>
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
  header: {
    alignItems: 'center' as const,
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
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
  eyeButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  forgotButton: {
    alignSelf: 'flex-end' as const,
    paddingVertical: 4,
    marginBottom: 12,
    marginTop: -6,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
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
