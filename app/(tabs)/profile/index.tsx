import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  Star,
  BadgeCheck,
  Shield,
  FileText,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Car,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}

function MenuItem({ icon, label, sublabel, onPress, danger, badge }: MenuItemProps) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
      </View>
      {badge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useApp();

  const handleSignal = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Signalement de sécurité',
      'Si vous avez un problème de sécurité, veuillez contacter notre équipe immédiatement.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Signaler', style: 'destructive', onPress: () => console.log('[Profile] Safety report initiated') },
      ]
    );
  }, []);

  const handleBulletin = useCallback(() => {
    Alert.alert(
      'Bulletin N°3',
      'Le bulletin n°3 est un extrait du casier judiciaire obligatoire pour conduire sur Faso Auto-stop.\n\nObtenez-le sur :\necasier-judiciaire.gov.bf',
      [{ text: 'Compris' }]
    );
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(167, 139, 250, 0.15)', 'transparent']}
        style={styles.topGlow}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard variant="accent" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              {profile.verified && (
                <View style={styles.verifiedBadge}>
                  <BadgeCheck size={16} color={Colors.primary} fill={Colors.white} />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profilePhone}>{profile.phone}</Text>
              <View style={styles.ratingRow}>
                <Star size={13} color={Colors.orange} fill={Colors.orange} />
                <Text style={styles.ratingText}>{profile.rating}</Text>
                <Text style={styles.ratingDot}>·</Text>
                <Text style={styles.tripCount}>{profile.tripsCompleted} trajets</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.tripsCompleted}</Text>
              <Text style={styles.statLabel}>Trajets</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.orange }]}>{profile.rating}</Text>
              <Text style={styles.statLabel}>Note</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.green }]}>
                {profile.verified ? 'Oui' : 'Non'}
              </Text>
              <Text style={styles.statLabel}>Vérifié</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.menuSection}>
          <MenuItem
            icon={<Shield size={18} color={Colors.primary} />}
            label="Vérification du profil"
            sublabel={profile.verified ? 'Profil vérifié' : 'Compléter la vérification'}
            onPress={() => console.log('[Profile] Verification tapped')}
            badge={profile.verified ? '✓' : '!'}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<FileText size={18} color={Colors.green} />}
            label="Bulletin N°3"
            sublabel={profile.bulletin3Uploaded ? 'Document envoyé' : 'Requis pour conduire'}
            onPress={handleBulletin}
            badge={profile.bulletin3Uploaded ? '✓' : '!'}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<Car size={18} color={Colors.orange} />}
            label="Mes trajets publiés"
            sublabel="Gérer vos trajets actifs"
            onPress={() => console.log('[Profile] My trips tapped')}
          />
        </GlassCard>

        <GlassCard style={styles.menuSection}>
          <MenuItem
            icon={<Bell size={18} color={Colors.primary} />}
            label="Notifications"
            sublabel="Nouveaux matchs et confirmations"
            onPress={() => console.log('[Profile] Notifications tapped')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<HelpCircle size={18} color={Colors.textSecondary} />}
            label="Aide et support"
            sublabel="FAQ et contact"
            onPress={() => console.log('[Profile] Help tapped')}
          />
        </GlassCard>

        <GlassCard style={styles.menuSection}>
          <MenuItem
            icon={<AlertTriangle size={18} color={Colors.danger} />}
            label="Signaler un problème"
            sublabel="Sécurité et urgences"
            onPress={handleSignal}
            danger
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<LogOut size={18} color={Colors.danger} />}
            label="Se déconnecter"
            onPress={() => Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Oui', style: 'destructive' },
            ])}
            danger
          />
        </GlassCard>

        <Text style={styles.memberSince}>
          Membre depuis {profile.memberSince}
        </Text>
        <Text style={styles.version}>Faso Auto-stop v1.0</Text>

        <View style={{ height: 30 }} />
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  profileCard: {
    marginBottom: 14,
  },
  profileHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative' as const,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.40)',
  },
  verifiedBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  profilePhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.orange,
  },
  ratingDot: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  tripCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(125, 60, 152, 0.08)',
  },
  statItem: {
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(125, 60, 152, 0.08)',
  },
  menuSection: {
    marginBottom: 14,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(125, 60, 152, 0.08)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  menuLabelDanger: {
    color: Colors.danger,
  },
  menuSublabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(125, 60, 152, 0.12)',
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(125, 60, 152, 0.06)',
    marginLeft: 64,
  },
  memberSince: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 8,
  },
  version: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 4,
    opacity: 0.6,
  },
});
