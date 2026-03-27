import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, LogIn } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import GlassCard from '@/components/GlassCard';

type ScreenState = 'loading' | 'ready' | 'error' | 'done';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  /* ─── Extract tokens from the URL hash (works on web + mobile deep links) ─── */
  const handleUrl = useCallback(async (url: string) => {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
      setScreenState('error');
      return;
    }
    const hash = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token') ?? '';
    const type         = params.get('type');

    if (type === 'recovery' && accessToken) {
      const { error } = await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      });
      setScreenState(error ? 'error' : 'ready');
    } else {
      // On web with detectSessionInUrl: true, Supabase may already have set the
      // session before we arrive here — check for an active session
      const { data } = await supabase.auth.getSession();
      setScreenState(data.session ? 'ready' : 'error');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      console.log('[ResetPassword] Web URL:', url);
      if (url && url.includes('#')) {
        handleUrl(url);
      } else {
        console.log('[ResetPassword] No hash found in web URL, showing error');
        setScreenState('error');
      }
    } else {
      Linking.getInitialURL().then((url) => {
        console.log('[ResetPassword] Mobile initial URL:', url);
        if (url) {
          handleUrl(url);
        } else {
          setScreenState('error');
        }
      });
      const sub = Linking.addEventListener('url', ({ url }) => {
        console.log('[ResetPassword] Mobile deep link URL:', url);
        handleUrl(url);
      });
      return () => sub.remove();
    }
  }, [handleUrl]);

  /* ─── Submit new password ─── */
  const handleReset = useCallback(async () => {
    let valid = true;
    setPwdError('');
    setConfirmError('');

    if (password.length < 6) {
      setPwdError('Le mot de passe doit contenir au moins 6 caractères.');
      valid = false;
    }
    if (password !== confirm) {
      setConfirmError('Les mots de passe ne correspondent pas.');
      valid = false;
    }
    if (!valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setPwdError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScreenState('done');
    }
  }, [password, confirm]);

  /* ─── Loading ─── */
  if (screenState === 'loading') {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Vérification du lien…</Text>
      </View>
    );
  }

  /* ─── Error / expired ─── */
  if (screenState === 'error') {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
        />
        <GlassCard style={styles.stateCard}>
          <AlertCircle size={48} color={Colors.danger} />
          <Text style={styles.stateTitle}>Lien invalide ou expiré</Text>
          <Text style={styles.stateSubtext}>
            Ce lien de réinitialisation n'est plus valide.{'\n'}
            Veuillez en demander un nouveau depuis l'écran de connexion.
          </Text>
          <Pressable onPress={() => router.replace('/login')} style={styles.stateButton}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.stateGradient}
            >
              <LogIn size={16} color={Colors.white} />
              <Text style={styles.stateButtonText}>Retour à la connexion</Text>
            </LinearGradient>
          </Pressable>
        </GlassCard>
      </View>
    );
  }

  /* ─── Success ─── */
  if (screenState === 'done') {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
        />
        <GlassCard style={styles.stateCard}>
          <CheckCircle size={48} color={Colors.green} />
          <Text style={styles.stateTitle}>Mot de passe modifié !</Text>
          <Text style={styles.stateSubtext}>
            Votre mot de passe a été mis à jour avec succès.{'\n'}
            Vous pouvez maintenant vous connecter.
          </Text>
          <Pressable onPress={() => router.replace('/login')} style={styles.stateButton}>
            <LinearGradient
              colors={[Colors.green, Colors.greenDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.stateGradient}
            >
              <LogIn size={16} color={Colors.white} />
              <Text style={styles.stateButtonText}>Se connecter</Text>
            </LinearGradient>
          </Pressable>
        </GlassCard>
      </View>
    );
  }

  /* ─── Form ─── */
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
            <Text style={styles.tagline}>Créez un nouveau mot de passe</Text>
          </View>

          <GlassCard variant="accent" style={styles.formCard}>
            <Text style={styles.formTitle}>🔑 Nouveau mot de passe</Text>
            <Text style={styles.formSubtitle}>
              Choisissez un mot de passe sécurisé d'au moins 6 caractères.
            </Text>

            {/* New password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <View style={[styles.inputRow, pwdError ? styles.inputRowError : null]}>
                <Lock size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPwdError(''); }}
                  placeholder="6 caractères minimum"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} style={styles.eyeButton}>
                  {showPassword
                    ? <EyeOff size={18} color={Colors.textMuted} />
                    : <Eye    size={18} color={Colors.textMuted} />}
                </Pressable>
              </View>
              {pwdError ? <Text style={styles.errorText}>{pwdError}</Text> : null}
            </View>

            {/* Confirm password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <View style={[styles.inputRow, confirmError ? styles.inputRowError : null]}>
                <Lock size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={(t) => { setConfirm(t); setConfirmError(''); }}
                  placeholder="Répétez le mot de passe"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showConfirm}
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={10} style={styles.eyeButton}>
                  {showConfirm
                    ? <EyeOff size={18} color={Colors.textMuted} />
                    : <Eye    size={18} color={Colors.textMuted} />}
                </Pressable>
              </View>
              {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
            </View>

            <Pressable
              onPress={handleReset}
              style={[styles.submitButton, saving && { opacity: 0.7 }]}
              disabled={saving}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {saving
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Lock size={18} color={Colors.white} />}
                <Text style={styles.submitText}>
                  {saving ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
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
  center: { justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24 },
  flex: { flex: 1 },
  topGlow: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 350 },
  loadingText: { marginTop: 14, fontSize: 14, color: Colors.textSecondary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: 'center' as const, marginBottom: 36 },
  appName: { fontSize: 30, fontWeight: '800' as const, color: Colors.text, textAlign: 'center' as const },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' as const },
  formCard: { marginBottom: 20 },
  formTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, marginBottom: 8, textAlign: 'center' as const },
  formSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const, marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.12)',
    borderRadius: 12, paddingHorizontal: 14, gap: 10,
  },
  inputRowError: { borderColor: Colors.danger, backgroundColor: 'rgba(244,67,54,0.05)' },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: Colors.text },
  eyeButton: { paddingHorizontal: 4, paddingVertical: 8 },
  errorText: { fontSize: 11, color: Colors.danger, marginTop: 4, fontWeight: '500' as const },
  submitButton: { marginTop: 8, borderRadius: 14, overflow: 'hidden' as const },
  submitGradient: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  submitText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  /* State screens */
  stateCard: { alignItems: 'center' as const, gap: 12, paddingVertical: 32, width: '100%' as any },
  stateTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, textAlign: 'center' as const },
  stateSubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const, lineHeight: 22 },
  stateButton: { marginTop: 8, borderRadius: 14, overflow: 'hidden' as const, width: '100%' as any },
  stateGradient: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  stateButtonText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
});
