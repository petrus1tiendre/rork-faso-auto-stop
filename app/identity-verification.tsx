import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, Camera, FileText, Shield, CheckCircle,
  Clock, XCircle, Upload, AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/providers/AppProvider';
import GlassCard from '@/components/GlassCard';

/* ─── Types ─── */
type DocType = 'photo' | 'cnb' | 'casier';
type DocStatus = 'pending' | 'approved' | 'rejected' | 'none';

interface DocRecord {
  id: string;
  doc_type: DocType;
  file_url: string;
  status: DocStatus;
  notes: string | null;
  created_at: string;
}

interface DocInfo {
  type: DocType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const DOC_INFOS: DocInfo[] = [
  {
    type: 'photo',
    label: "Photo d'identité",
    description: 'Selfie clair avec votre visage visible',
    icon: <Camera size={22} color={Colors.primary} />,
    color: Colors.primary,
  },
  {
    type: 'cnb',
    label: 'CNB / CNIB',
    description: 'Carte Nationale Biométrique du Burkina Faso (recto + verso)',
    icon: <Shield size={22} color={Colors.orange} />,
    color: Colors.orange,
  },
  {
    type: 'casier',
    label: 'Casier judiciaire (Bulletin N°3)',
    description: 'Extrait du casier judiciaire datant de moins de 3 mois',
    icon: <FileText size={22} color={Colors.green} />,
    color: Colors.green,
  },
];

const STATUS_INFO: Record<DocStatus, { label: string; icon: React.ReactNode; color: string }> = {
  none:     { label: 'Non soumis', icon: <Upload size={14} color={Colors.textMuted} />, color: Colors.textMuted },
  pending:  { label: 'En cours de vérification', icon: <Clock size={14} color={Colors.orange} />, color: Colors.orange },
  approved: { label: 'Approuvé ✓', icon: <CheckCircle size={14} color={Colors.green} />, color: Colors.green },
  rejected: { label: 'Refusé', icon: <XCircle size={14} color={Colors.danger} />, color: Colors.danger },
};

export default function IdentityVerificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId, session } = useApp();

  const [docs, setDocs] = useState<Record<DocType, DocRecord | null>>({
    photo: null, cnb: null, casier: null,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocType | null>(null);

  /* ─── Load existing documents ─── */
  const loadDocs = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const map: Record<DocType, DocRecord | null> = { photo: null, cnb: null, casier: null };
    for (const doc of (data ?? []) as DocRecord[]) {
      // Keep most recent per type
      if (!map[doc.doc_type]) map[doc.doc_type] = doc;
    }
    setDocs(map);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  /* ─── Pick & upload ─── */
  const handleUpload = useCallback(async (docType: DocType) => {
    if (!userId) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.75,
      aspect: docType === 'photo' ? [1, 1] : [4, 3],
    });

    if (result.canceled || !result.assets[0]) return;
    const { uri } = result.assets[0];

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(docType);

    try {
      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `${userId}/${docType}-${Date.now()}.${ext}`;

      // Upload to storage
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(fileName, formData, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL (valid for 10 years)
      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileName, 60 * 60 * 24 * 3650);

      const fileUrl = signedData?.signedUrl ?? '';

      // Upsert into documents table
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          doc_type: docType,
          file_url: fileUrl,
          status: 'pending',
        });

      if (insertError) throw insertError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadDocs();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erreur', err?.message ?? 'Impossible d\'envoyer le document.');
    } finally {
      setUploading(null);
    }
  }, [userId, loadDocs]);

  /* ─── Overall status ─── */
  const allApproved = Object.values(docs).every((d) => d?.status === 'approved');
  const anyRejected = Object.values(docs).some((d) => d?.status === 'rejected');
  const anyPending  = Object.values(docs).some((d) => d?.status === 'pending');
  const noneSubmitted = Object.values(docs).every((d) => !d);

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
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.pageHeader}>
          <Shield size={32} color={Colors.primary} />
          <Text style={styles.pageTitle}>Vérification d'identité</Text>
          <Text style={styles.pageSubtitle}>
            Soumettez vos documents pour obtenir le badge vérifié et accéder à toutes les fonctionnalités.
          </Text>
        </View>

        {/* Global status banner */}
        {!loading && !noneSubmitted && (
          <GlassCard
            variant={allApproved ? 'accent' : anyRejected ? 'default' : 'warm'}
            style={styles.statusBanner}
          >
            {allApproved ? (
              <>
                <CheckCircle size={20} color={Colors.green} />
                <Text style={[styles.bannerText, { color: Colors.green }]}>
                  Tous vos documents ont été approuvés 🎉
                </Text>
              </>
            ) : anyRejected ? (
              <>
                <AlertCircle size={20} color={Colors.danger} />
                <Text style={[styles.bannerText, { color: Colors.danger }]}>
                  Un ou plusieurs documents ont été refusés. Veuillez les soumettre à nouveau.
                </Text>
              </>
            ) : anyPending ? (
              <>
                <Clock size={20} color={Colors.orange} />
                <Text style={[styles.bannerText, { color: Colors.orange }]}>
                  Vos documents sont en cours de vérification (24–48h).
                </Text>
              </>
            ) : null}
          </GlassCard>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Document cards */}
            {DOC_INFOS.map((info) => {
              const doc = docs[info.type];
              const status: DocStatus = doc?.status ?? 'none';
              const statusInfo = STATUS_INFO[status];
              const isUploading = uploading === info.type;

              return (
                <GlassCard key={info.type} style={styles.docCard}>
                  {/* Card header */}
                  <View style={styles.docHeader}>
                    <View style={[styles.docIconWrap, { backgroundColor: `${info.color}14` }]}>
                      {info.icon}
                    </View>
                    <View style={styles.docTitleWrap}>
                      <Text style={styles.docLabel}>{info.label}</Text>
                      <Text style={styles.docDesc}>{info.description}</Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={[styles.statusRow, { backgroundColor: `${statusInfo.color}10` }]}>
                    {statusInfo.icon}
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>

                  {/* Notes (if rejected) */}
                  {doc?.status === 'rejected' && doc.notes ? (
                    <Text style={styles.notesText}>⚠️ {doc.notes}</Text>
                  ) : null}

                  {/* Preview thumbnail */}
                  {doc?.file_url && doc.status !== 'rejected' ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: doc.file_url }}
                        style={styles.previewImage}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}

                  {/* Upload button */}
                  {(status === 'none' || status === 'rejected') && (
                    <Pressable
                      onPress={() => handleUpload(info.type)}
                      disabled={isUploading}
                      style={[styles.uploadBtn, { borderColor: `${info.color}40` }]}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color={info.color} />
                      ) : (
                        <Upload size={16} color={info.color} />
                      )}
                      <Text style={[styles.uploadBtnText, { color: info.color }]}>
                        {isUploading
                          ? 'Envoi en cours…'
                          : status === 'rejected'
                          ? 'Renvoyer le document'
                          : 'Choisir une photo'}
                      </Text>
                    </Pressable>
                  )}

                  {status === 'pending' && (
                    <Pressable
                      onPress={() => handleUpload(info.type)}
                      disabled={isUploading}
                      style={[styles.uploadBtn, { borderColor: 'rgba(33,150,243,0.20)' }]}
                    >
                      {isUploading
                        ? <ActivityIndicator size="small" color={Colors.textMuted} />
                        : <Upload size={15} color={Colors.textMuted} />}
                      <Text style={[styles.uploadBtnText, { color: Colors.textMuted }]}>
                        {isUploading ? 'Envoi en cours…' : 'Remplacer le document'}
                      </Text>
                    </Pressable>
                  )}
                </GlassCard>
              );
            })}

            {/* Info card */}
            <GlassCard variant="warm" style={styles.infoCard}>
              <AlertCircle size={16} color={Colors.orange} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Comment ça marche ?</Text>
                <Text style={styles.infoText}>
                  1. Prenez ou choisissez une photo claire de chaque document.{'\n'}
                  2. Nos équipes vérifient votre dossier sous 24–48h.{'\n'}
                  3. Vous recevez le badge vérifié une fois approuvé.
                </Text>
              </View>
            </GlassCard>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },
  backButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 20 },
  backText: { fontSize: 15, color: Colors.text, fontWeight: '600' as const },
  pageHeader: { alignItems: 'center' as const, marginBottom: 22, gap: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  pageSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const, lineHeight: 20 },

  statusBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 14 },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },

  docCard: { marginBottom: 14 },
  docHeader: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12, marginBottom: 12 },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
  docTitleWrap: { flex: 1 },
  docLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  docDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },

  statusRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 10,
  },
  statusText: { fontSize: 12, fontWeight: '600' as const },
  notesText: { fontSize: 12, color: Colors.danger, marginBottom: 10, lineHeight: 17 },

  previewWrap: { marginBottom: 10, borderRadius: 10, overflow: 'hidden' as const },
  previewImage: { width: '100%', height: 120, borderRadius: 10 },

  uploadBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed' as const,
    borderRadius: 12, paddingVertical: 12,
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600' as const },

  infoCard: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10 },
  infoTitle: { fontSize: 13, fontWeight: '700' as const, color: Colors.orange, marginBottom: 6 },
  infoText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 20 },
});
