import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, ArrowLeft, MessageCircle, Car, Shield, Megaphone } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';

interface ToggleItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

function ToggleItem({ icon, label, sublabel, value, onToggle }: ToggleItemProps) {
  return (
    <View style={styles.toggleItem}>
      <View style={styles.toggleIcon}>{icon}</View>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSublabel}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E0E0E0', true: Colors.primaryLight }}
        thumbColor={value ? Colors.primary : '#FAFAFA'}
      />
    </View>
  );
}

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [newTrips, setNewTrips] = useState(true);
  const [messages, setMessages] = useState(true);
  const [bookings, setBookings] = useState(true);
  const [promos, setPromos] = useState(false);

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
          <Bell size={32} color={Colors.primary} />
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Gérez vos préférences de notifications</Text>
        </View>

        <GlassCard style={styles.card}>
          <ToggleItem
            icon={<Car size={18} color={Colors.orange} />}
            label="Nouveaux trajets"
            sublabel="Notification quand un trajet correspond à vos critères"
            value={newTrips}
            onToggle={setNewTrips}
          />
          <View style={styles.divider} />
          <ToggleItem
            icon={<MessageCircle size={18} color={Colors.primary} />}
            label="Messages"
            sublabel="Notifications pour les nouveaux messages"
            value={messages}
            onToggle={setMessages}
          />
          <View style={styles.divider} />
          <ToggleItem
            icon={<Shield size={18} color={Colors.green} />}
            label="Réservations"
            sublabel="Confirmations et mises à jour de réservation"
            value={bookings}
            onToggle={setBookings}
          />
          <View style={styles.divider} />
          <ToggleItem
            icon={<Megaphone size={18} color={Colors.textSecondary} />}
            label="Promotions"
            sublabel="Offres et actualités Faso Auto-stop"
            value={promos}
            onToggle={setPromos}
          />
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
  card: { paddingVertical: 4, paddingHorizontal: 0 },
  toggleItem: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(33,150,243,0.08)', alignItems: 'center' as const, justifyContent: 'center' as const },
  toggleContent: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  toggleSublabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(33,150,243,0.06)', marginLeft: 64 },
});
