import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/providers/AppProvider';
import { Message } from '@/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: '⏳ En attente',  color: Colors.orange },
  confirmed: { label: '✅ Confirmé',    color: Colors.green  },
  cancelled: { label: '❌ Annulé',      color: Colors.danger },
  completed: { label: '🏁 Terminé',     color: Colors.textMuted },
};

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatDay(ts: string): string {
  try {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return ''; }
}

function groupMessagesByDay(messages: Message[]): Array<{ type: 'day'; label: string } | { type: 'msg'; msg: Message }> {
  const result: Array<{ type: 'day'; label: string } | { type: 'msg'; msg: Message }> = [];
  let lastDay = '';
  for (const msg of messages) {
    const day = new Date(msg.created_at).toDateString();
    if (day !== lastDay) {
      result.push({ type: 'day', label: formatDay(msg.created_at) });
      lastDay = day;
    }
    result.push({ type: 'msg', msg });
  }
  return result;
}

export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useApp();

  const params = useLocalSearchParams<{
    bookingId: string;
    otherName: string;
    tripSummary: string;
    bookingStatus: string;
  }>();

  const { bookingId, otherName = 'Conversation', tripSummary = '', bookingStatus = 'pending' } = params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  /* ─── Load initial messages ─── */
  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []) as Message[]);
        setLoading(false);
      });
  }, [bookingId]);

  /* ─── Real-time subscription ─── */
  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`conv-${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates (if we already optimistically added it)
            const incoming = payload.new as Message;
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  /* ─── Scroll to bottom when messages load ─── */
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [loading]);

  /* ─── Send message ─── */
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !bookingId || !userId || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSending(true);
    setText('');

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      booking_id: bookingId,
      sender_id: userId,
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    const { data, error } = await supabase
      .from('messages')
      .insert({ booking_id: bookingId, sender_id: userId, content: trimmed })
      .select()
      .single();

    setSending(false);
    if (!error && data) {
      // Replace the optimistic message with the real one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? (data as Message) : m))
      );
    } else if (error) {
      // Rollback optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(trimmed); // put back the text
    }
  }, [text, bookingId, userId, sending]);

  /* ─── Render ─── */
  const statusInfo = STATUS_LABELS[bookingStatus] ?? { label: bookingStatus, color: Colors.textMuted };
  const grouped = groupMessagesByDay(messages);

  const renderItem = ({ item }: { item: typeof grouped[number] }) => {
    if (item.type === 'day') {
      return (
        <View style={styles.dayRow}>
          <Text style={styles.dayLabel}>{item.label}</Text>
        </View>
      );
    }
    const { msg } = item;
    const isMe = msg.sender_id === userId;
    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
            {msg.content}
          </Text>
          <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
            {formatTime(msg.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
          {tripSummary ? (
            <Text style={styles.headerTrip} numberOfLines={1}>{tripSummary}</Text>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusInfo.color}18` }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyCenter}>
            <MessageCircle size={48} color={Colors.primaryLight} />
            <Text style={styles.emptyTitle}>Démarrez la conversation</Text>
            <Text style={styles.emptySubtext}>
              Envoyez un message pour vous organiser avec {otherName}.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={grouped}
            keyExtractor={(item, i) =>
              item.type === 'day' ? `day-${i}` : item.msg.id
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Écrire un message…"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          >
            {sending
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Send size={18} color={Colors.white} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33,150,243,0.10)',
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  headerTrip: { fontSize: 12, color: Colors.primary, marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' as const },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCenter: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  dayRow: { alignItems: 'center', marginVertical: 10 },
  dayLabel: {
    fontSize: 11, color: Colors.textMuted, fontWeight: '600' as const,
    backgroundColor: 'rgba(255,255,255,0.70)', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, overflow: 'hidden',
  },
  bubbleWrapper: { marginVertical: 2 },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubbleWrapperThem: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%', paddingHorizontal: 13, paddingTop: 9, paddingBottom: 6,
    borderRadius: 18, gap: 2,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.10)',
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: Colors.white },
  bubbleTextThem: { color: Colors.text },
  bubbleTime: { fontSize: 10 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  bubbleTimeThem: { color: Colors.textMuted },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopWidth: 1, borderTopColor: 'rgba(33,150,243,0.10)',
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 110,
    backgroundColor: 'rgba(33,150,243,0.06)',
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.14)',
    borderRadius: 21, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: Colors.text,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
