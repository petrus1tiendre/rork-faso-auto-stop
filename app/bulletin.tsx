import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FileText, ArrowLeft, ExternalLink, Info, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';

export default function BulletinScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <View style={styles.header}>
          <FileText size={32} color={Colors.green} />
          <Text style={styles.title}>Bulletin N°3</Text>
          <Text style={styles.subtitle}>
            Extrait du casier judiciaire obligatoire pour conduire
          </Text>
        </View>

        <GlassCard variant="accent" style={styles.card}>
          <View style={styles.infoRow}>
            <Info size={18} color={Colors.primary} />
            <Text style={styles.infoTitle}>Qu{"'"}est-ce que le Bulletin N°3 ?</Text>
          </View>
          <Text style={styles.infoText}>
            Le Bulletin N°3 est un extrait du casier judiciaire qui atteste de l{"'"}absence de condamnations pénales. Il est obligatoire pour tout conducteur sur Faso Auto-stop.
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.infoRow}>
            <Shield size={18} color={Colors.green} />
            <Text style={styles.infoTitle}>Comment l{"'"}obtenir ?</Text>
          </View>
          <Text style={styles.infoText}>
            1. Rendez-vous au tribunal de grande instance de votre ville{'\n'}
            2. Munissez-vous de votre CNI ou passeport{'\n'}
            3. Payez les frais de délivrance (environ 600 FCFA){'\n'}
            4. Récupérez votre bulletin sous 48h à 72h
          </Text>
        </GlassCard>

        <GlassCard variant="warm" style={styles.card}>
          <Text style={styles.infoTitle}>Demande en ligne</Text>
          <Text style={styles.infoText}>
            Vous pouvez aussi demander votre bulletin en ligne sur le site officiel du gouvernement.
          </Text>
          <Pressable
            onPress={() => Linking.openURL('https://www.justice.gov.bf')}
            style={styles.linkButton}
          >
            <ExternalLink size={16} color={Colors.white} />
            <Text style={styles.linkText}>Visiter justice.gov.bf</Text>
          </Pressable>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.infoTitle}>Soumettre votre document</Text>
          <Text style={styles.infoText}>
            Une fois obtenu, prenez une photo claire de votre Bulletin N°3 et envoyez-la à notre équipe de vérification 
            via le formulaire de signalement ou par email à support@fasoautostop.com.
          </Text>
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  backButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 24 },
  backText: { fontSize: 15, color: Colors.text, fontWeight: '600' as const },
  header: { alignItems: 'center' as const, marginBottom: 28, gap: 8 },
  title: { fontSize: 24, fontWeight: '800' as const, color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const },
  card: { marginBottom: 14 },
  infoRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 10 },
  infoTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  infoText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  linkButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, backgroundColor: Colors.green, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  linkText: { fontSize: 14, fontWeight: '700' as const, color: Colors.white },
});
