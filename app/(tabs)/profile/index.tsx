import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';
import { supabase } from '@/lib/supabase';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

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
  const router = useRouter();
  const { profile, signOut, session, userTripsCount } = useApp();
  const { profileLoading, profileError, refetchProfile } = useApp();
  const [loadTimeout, setLoadTimeout] = useState<boolean>(false);
  const [tapCount, setTapCount] = useState<number>(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading) {
      setLoadTimeout(false);
      const timer = setTimeout(() => {
        setLoadTimeout(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [profileLoading]);

  const handlePickAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setLocalAvatar(uri);

        if (session?.user?.id) {
          try {
            const fileName = `${session.user.id}-${Date.now()}.jpg`;

            // Use FormData for React Native compatibility
            const formData = new FormData();
            formData.append('file', {
              uri,
              name: fileName,
              type: 'image/jpeg',
            } as any);

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, formData, { upsert: true });

            if (!uploadError) {
              const { data: publicUrl } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

              await supabase.from('profiles')
                .update({ avatar_url: publicUrl.publicUrl })
                .eq('id', session.user.id);

              refetchProfile();
            } else {
            }
          } catch (e) {
          }
        }
      }
    } catch (e) {
    }
  }, [session, refetchProfile]);

  const handleLogout = useCallback(() => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: () => {
          signOut();
        },
      },
    ]);
  }, [signOut]);

  const handleVersionTap = useCallback(() => {
    const newCount = tapCount + 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);

    if (newCount >= 5) {
      setTapCount(0);
      if (tapTimer.current) clearTimeout(tapTimer.current);
      const email = session?.user?.email;
      if (email === 'hans2tiendrebeogo@gmail.com') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push('/admin');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Accès refusé', "Vous n'avez pas les droits administrateur.");
      }
    } else {
      setTapCount(newCount);
    }
  }, [tapCount, session, router]);

  const displayName = profile?.full_name || 'Compléter mon profil';
  const displayEmail = session?.user?.email ?? '';
  const hasAvatar = !!(localAvatar ?? profile?.avatar_url);
  const displayAvatarUri = localAvatar ?? profile?.avatar_url ?? undefined;
  const avatarInitials = profile?.full_name
    ? getInitials(profile.full_name)
    : (session?.user?.email?.[0]?.toUpperCase() ?? '?');
  const isVerified = profile?.is_verified ?? false;

  const completionPct = useMemo(() => {
    let score = 0;
    if (profile?.full_name) score += 25;
    if (profile?.avatar_url || localAvatar) score += 25;
    if (profile?.is_verified) score += 25;
    if ((userTripsCount ?? 0) > 0) score += 25;
    return score;
  }, [profile, localAvatar, userTripsCount]);
  const rating = profile?.rating ?? 5.0;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

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
            <Pressable onPress={handlePickAvatar} style={styles.avatarWrapper}>
              {hasAvatar ? (
                <Image source={{ uri: displayAvatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.initialsAvatar]}>
                  <Text style={styles.initialsAvatarText}>{avatarInitials}</Text>
                </View>
              )}
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <BadgeCheck size={16} color={Colors.primary} fill={Colors.white} />
                </View>
              )}
              <View style={styles.cameraOverlay}>
                <Camera size={14} color={Colors.white} />
              </View>
            </Pressable>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profilePhone}>{displayEmail}</Text>
              <View style={styles.ratingRow}>
                <Star size={13} color={Colors.orange} fill={Colors.orange} />
                <Text style={styles.ratingText}>{rating}</Text>
                <Text style={styles.ratingDot}>·</Text>
                <Text style={styles.tripCount}>{userTripsCount} trajets</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userTripsCount}</Text>
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

          {/* Profile completion bar */}
          <View style={styles.completionSection}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>Profil complété à {completionPct}%</Text>
              {completionPct < 100 && (
                <Text style={styles.completionHint}>
                  {completionPct < 50 ? 'À compléter' : completionPct < 75 ? 'Presque là !' : 'Presque parfait !'}
                </Text>
              )}
              {completionPct === 100 && (
                <Text style={[styles.completionHint, { color: Colors.green }]}>✓ Complet</Text>
              )}
            </View>
            <View style={styles.completionBarBg}>
              <View
                style={[
                  styles.completionBarFill,
                  {
                    width: `${completionPct}%` as any,
                    backgroundColor:
                      completionPct === 100 ? Colors.green
                      : completionPct >= 75  ? Colors.primary
                      : Colors.orange,
                  },
                ]}
              />
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.menuSection}>
          <MenuItem
            icon={<Shield size={18} color={Colors.primary} />}
            label="Vérification du profil (téléphone)"
            sublabel={isVerified ? 'Profil vérifié' : 'Vérifier mon numéro'}
            onPress={() => router.push('/profile-verification')}
            badge={isVerified ? '✓' : '!'}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<FileText size={18} color={Colors.green} />}
            label="Vérification d'identité"
            sublabel="Photo · CNB · Casier judiciaire"
            onPress={() => router.push('/identity-verification')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<Car size={18} color={Colors.orange} />}
            label="Mes trajets publiés"
            sublabel="Gérer vos trajets actifs"
            onPress={() => router.push('/my-trips')}
          />
        </GlassCard>

        <GlassCard style={styles.menuSection}>
          <MenuItem
            icon={<Bell size={18} color={Colors.primary} />}
            label="Notifications"
            sublabel="Nouveaux matchs et confirmations"
            onPress={() => router.push('/notifications-settings')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={<HelpCircle size={18} color={Colors.textSecondary} />}
            label="Aide et support"
            sublabel="FAQ et contact"
            onPress={() => router.push('/help')}
          />
        </GlassCard>

        <GlassCard style={styles.menuSection}>
          <MenuItem
            icon={<AlertTriangle size={18} color={Colors.danger} />}
            label="Signaler un problème"
            sublabel="Sécurité et urgences"
            onPress={() => router.push('/report-issue')}
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
        <Pressable onPress={handleVersionTap}>
          <Text style={styles.version}>Faso Auto-stop v1.0</Text>
        </Pressable>

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
  cameraOverlay: {
    position: 'absolute' as const,
    bottom: -2,
    left: -2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.white,
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
  initialsAvatar: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  initialsAvatarText: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  completionSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(33, 150, 243, 0.08)',
  },
  completionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  completionHint: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  completionBarBg: {
    height: 6,
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  completionBarFill: {
    height: 6,
    borderRadius: 4,
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
