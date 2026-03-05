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
import { AlertTriangle, ArrowLeft, Send } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';

const categories = [
  'Comportement dangereux',
  'Problème de paiement',
  'Harcèlement',
  'Annulation abusive',
  'Autre',
];

export default function ReportIssueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!category) {
      Alert.alert('Catégorie requise', 'Veuillez sélectionner une catégorie.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description requise', 'Veuillez décrire le problème.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Signalement envoyé',
        'Notre équipe examinera votre signalement sous 24h. Merci pour votre vigilance.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      console.log('[ReportIssue] Report submitted:', { category, description });
    }, 1500);
  }, [category, description, router]);

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
            <AlertTriangle size={32} color={Colors.danger} />
            <Text style={styles.title}>Signaler un problème</Text>
            <Text style={styles.subtitle}>Votre sécurité est notre priorité</Text>
          </View>

          <GlassCard style={styles.formCard}>
            <Text style={styles.inputLabel}>Catégorie</Text>
            <View style={styles.categoriesGrid}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Description</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez le problème en détail..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Pressable
              onPress={handleSubmit}
              style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={[Colors.danger, '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Send size={18} color={Colors.white} />
                )}
                <Text style={styles.submitText}>
                  {isSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
                </Text>
              </LinearGradient>
            </Pressable>
          </GlassCard>

          <View style={{ height: 40 }} />
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
  inputLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  categoriesGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.60)', borderWidth: 1, borderColor: 'rgba(33,150,243,0.12)' },
  categoryChipActive: { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: Colors.danger },
  categoryText: { fontSize: 13, fontWeight: '500' as const, color: Colors.textSecondary },
  categoryTextActive: { color: Colors.danger, fontWeight: '700' as const },
  textArea: { backgroundColor: 'rgba(255,255,255,0.60)', borderWidth: 1, borderColor: 'rgba(33,150,243,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, minHeight: 120, paddingTop: 12 },
  submitButton: { marginTop: 16, borderRadius: 14, overflow: 'hidden' as const },
  submitGradient: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 15, borderRadius: 14 },
  submitText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
});
