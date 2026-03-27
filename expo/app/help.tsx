import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { HelpCircle, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Comment fonctionne Faso Auto-stop ?",
    answer: "Faso Auto-stop met en relation conducteurs et passagers pour partager les trajets. Les conducteurs publient leurs trajets et les passagers peuvent réserver une place. Le paiement se fait directement via Orange Money ou MoMo."
  },
  {
    question: "Comment publier un trajet ?",
    answer: "Allez dans l'onglet 'Publier', remplissez les informations de votre trajet (départ, arrivée, date, heure, nombre de places, prix) et appuyez sur 'Publier le trajet'. Votre trajet sera immédiatement visible par les passagers."
  },
  {
    question: "Comment réserver un trajet ?",
    answer: "Recherchez un trajet dans l'onglet 'Rechercher' ou sur la page d'accueil. Tapez sur un trajet pour voir les détails, puis appuyez sur 'Réserver' pour envoyer une demande au conducteur."
  },
  {
    question: "Qu'est-ce que le Bulletin N°3 ?",
    answer: "Le Bulletin N°3 est un extrait du casier judiciaire délivré par le tribunal. Il est obligatoire pour les conducteurs sur Faso Auto-stop afin de garantir la sécurité des passagers."
  },
  {
    question: "Comment fonctionne le paiement ?",
    answer: "Le paiement se fait via Orange Money ou MoMo. Le prix indiqué est la contribution par personne. Le conducteur et le passager s'accordent sur le montant dans le chat."
  },
  {
    question: "Que faire en cas de problème ?",
    answer: "Utilisez la fonction Signaler un problème dans votre profil. En cas d\u0027urgence, contactez directement les autorités locales. Notre équipe examine tous les signalements sous 24h."
  },
  {
    question: "Comment vérifier mon profil ?",
    answer: "Allez dans Profil > Vérification du profil. Renseignez votre nom complet et numéro de téléphone, puis soumettez votre Bulletin N°3 pour une vérification complète."
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable onPress={() => setExpanded(!expanded)} style={styles.faqItem}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        {expanded ? (
          <ChevronUp size={18} color={Colors.primary} />
        ) : (
          <ChevronDown size={18} color={Colors.textMuted} />
        )}
      </View>
      {expanded && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </Pressable>
  );
}

export default function HelpScreen() {
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
          <HelpCircle size={32} color={Colors.primary} />
          <Text style={styles.title}>Aide et support</Text>
          <Text style={styles.subtitle}>Questions fréquemment posées</Text>
        </View>

        <GlassCard style={styles.faqCard}>
          {faqItems.map((item, index) => (
            <React.Fragment key={index}>
              <FAQAccordion item={item} />
              {index < faqItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </GlassCard>

        <GlassCard variant="warm" style={styles.contactCard}>
          <Text style={styles.contactTitle}>Besoin d{"'"}aide supplémentaire ?</Text>
          <Text style={styles.contactText}>
            Contactez-nous à support@fasoautostop.com{'\n'}
            Ou appelez le +226 70 00 00 00
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
  faqCard: { paddingVertical: 4, paddingHorizontal: 0, marginBottom: 14 },
  faqItem: { paddingVertical: 14, paddingHorizontal: 16 },
  faqHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  faqQuestion: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, flex: 1, marginRight: 8 },
  faqAnswer: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 10 },
  divider: { height: 1, backgroundColor: 'rgba(33,150,243,0.06)', marginLeft: 16, marginRight: 16 },
  contactCard: { marginBottom: 14 },
  contactTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.orange, marginBottom: 8 },
  contactText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
