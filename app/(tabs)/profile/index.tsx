import React, { useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  StatusBar,
  ActivityIndicator,
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
  const { profile, signOut, session } = useApp();

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

  const handleLogout = useCallback(() => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: () => {
          console.log('[Profile] Logging out...');
          signOut();
        },
      },
    ]);
  }, [signOut]);

  const displayName = profile?.full_name ?? 'Utilisateur';
  const displayEmail = session?.user?.email ?? '';
  const displayAvatar = profile?.avatar_url ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face';
  const isVerified = profile?.is_verified ?? false;
  const rating = profile?.rating ?? 5.0;
  const totalTrips = profile?.total_trips ?? 0;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  const { profileLoading, profileError, refetchProfile } = useApp();
  const [loadTimeout, setLoadTimeout] = useState<boolean>(false);

  useEffect(() => {
    if (profileLoading) {
      setLoadTimeout(false);
      const timer = setTimeout(() => {
        setLoadTimeout(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [profileLoading]);

  if (!profile && session && profileLoading && !loadTimeout) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!profile && session && (loadTimeout || profileError)) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '600' as const, textAlign: 'center' as const, marginBottom: 8 }}>
          Impossible de charger le profil
        </Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 13, textAlign: 'center' as const, marginBottom: 20 }}>
          Vérifiez votre connexion et réessayez.
        </Text>
        <Pressable
          onPress={() => {
            setLoadTimeout(false);
            refetchProfile();
          }}
          style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: Colors.white, fontWeight: '700' as const, fontSize: 14 }}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(66, 165, 245, 0.15)', 'transparent']}
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
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <BadgeCheck size={16} color={Colors.primary} fill={Colors.white} />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profilePhone}>{displayEmail}</Text>
              <View style={styles.ratingRow}>
                <Star size={13} color={Colors.orange} fill={Colors.orange} />
                <Text style={styles.ratingText}>{rating}</Text>
                <Text style={styles.ratingDot}>·</Text>
                <Text style={styles.tripCount}>{totalTrips} trajets</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Trajets</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.orange }]}>{rating}</Text>
              <Text style={styles.statLabel}>Note</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.green }]}>
                {isVerified ? 'Oui' : 'Non'}
              </Text>
              <Text style={styles.statLabel}>Vérifié</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.menuSection}>
          <MenuItem
            icon={<Shield size={18} color={Colors.primary} />}
            label="Vérification du profil"
            sublabel={isVerified ? 'Profil vérifié' : 'Compléter la vérification'}
            onPress={() => console.log('[Profile] Verification tapped')}
            badge={isVerified ? '✓' : '!'}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<FileText size={18} color={Colors.green} />}
            label="Bulletin N°3"
            sublabel="Requis pour conduire"
            onPress={handleBulletin}
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
            onPress={handleLogout}
            danger
          />
        </GlassCard>

        {memberSince ? (
          <Text style={styles.memberSince}>
            Membre depuis {memberSince}
          </Text>
        ) : null}
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
    borderColor: 'rgba(66, 165, 245, 0.40)',
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
    borderTopColor: 'rgba(33, 150, 243, 0.08)',
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
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
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
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
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
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(33, 150, 243, 0.06)',
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
