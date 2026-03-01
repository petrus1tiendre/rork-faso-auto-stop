import React from 'react';
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
import { Image } from 'expo-image';
import { MessageCircle, Phone, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { chats } = useApp();

  const handleChatPress = (chatId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[ChatScreen] Opening chat:', chatId);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0A0E1A', '#0D1525', '#0A0E1A']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0, 191, 255, 0.05)', 'transparent']}
        style={styles.topGlow}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Vos conversations de trajet</Text>

        <GlassCard variant="warm" style={styles.paymentBanner}>
          <View style={styles.paymentRow}>
            <Phone size={18} color={Colors.accent} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Paiement Orange Money / MoMo</Text>
              <Text style={styles.paymentSubtext}>
                Envoyez un lien de paiement directement dans le chat
              </Text>
            </View>
          </View>
        </GlassCard>

        {chats.map((chat) => (
          <Pressable
            key={chat.id}
            onPress={() => handleChatPress(chat.id)}
          >
            <GlassCard style={styles.chatCard}>
              <View style={styles.chatRow}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: chat.otherAvatar }} style={styles.avatar} />
                  {chat.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unread}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatNameRow}>
                    <Text style={styles.chatName}>{chat.otherUser}</Text>
                    <Text style={styles.chatTime}>{chat.lastMessageTime}</Text>
                  </View>
                  <Text style={styles.chatTrip}>{chat.tripSummary}</Text>
                  <Text
                    style={[styles.chatMessage, chat.unread > 0 && styles.chatMessageUnread]}
                    numberOfLines={1}
                  >
                    {chat.lastMessage}
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.textMuted} />
              </View>
            </GlassCard>
          </Pressable>
        ))}

        {chats.length === 0 && (
          <GlassCard style={styles.emptyCard}>
            <MessageCircle size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Aucune conversation</Text>
            <Text style={styles.emptySubtext}>
              Réservez un trajet pour commencer à discuter
            </Text>
          </GlassCard>
        )}

        <View style={{ height: 20 }} />
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
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  paymentBanner: {
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  paymentSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chatCard: {
    marginBottom: 10,
  },
  chatRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative' as const,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 191, 255, 0.2)',
  },
  unreadBadge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: Colors.accent,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  chatInfo: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chatTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  chatTrip: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  chatMessage: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chatMessageUnread: {
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  emptyCard: {
    alignItems: 'center' as const,
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center' as const,
  },
});
