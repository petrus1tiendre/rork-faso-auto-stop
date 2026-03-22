import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Pressable, StatusBar,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, Camera, FileText, Shield, CheckCircle,
  Clock, XCircle, Upload, AlertCircle, Image as ImageIcon,
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
  cameraOnly: boolean; // true = selfie must be real-time
}

const DOC_INFOS: DocInfo[] = [
  {
    type: 'photo',
    label: "Selfie · Photo d'identité",
    description: 'Photo prise à l\'instant avec votre visage visible. La caméra frontale s\'ouvre automatiquement.',
    icon: <Camera size={22} color={Colors.primary} />,
    color: Colors.primary,
    cameraOnly: true, // MUST be real-time camera
  },
  {
    type: 'cnb',
    label: 'CNB / CNIB',
    description: 'Carte Nationale Biométrique du Burkina Faso (recto + verso). Photo ou depuis la galerie.',
    icon: <Shield size={22} color={Colors.orange} />,
    color: Colors.orange,
    cameraOnly: false,
  },
  {
    type: 'casier',
    label: 'Casier judiciaire (Bulletin N°3)',
    description: 'Extrait du casier judiciaire datant de moins de 3 mois. Photo ou depuis la galerie.',
    icon: <FileText size={22} color={Colors.green} />,
    color: Colors.green,
    cameraOnly: false,
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
  const { userId } = useApp();

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
      if (!map[doc.doc_type]) map[doc.doc_type] = doc;
    }
    setDocs(map);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  /* ─── Request camera permissions ─── */
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'L\'accès à la caméra est nécessaire pour prendre votre selfie. Activez-le dans les paramètres.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }, []);

  /* ─── Upload helper ─── */
  const uploadImage = useCallback(async (docType: DocType, uri: string) => {
    if (!userId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(docType);

    try {
      const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
      const fileName = `${userId}/${docType}-${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, formData, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileName, 60 * 60 * 24 * 3650); // 10 years

      const fileUrl = signedData?.signedUrl ?? '';

      const { error: insertError } = await supabase
        .from('documents')
        .insert({ user_id: userId, doc_type: docType, file_url: fileUrl, status: 'pending' });

      if (insertError) throw insertError;

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadDocs();
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erreur', err?.message ?? "Impossible d'envoyer le document.");
    } finally {
      setUploading(null);
    }
  }, [userId, loadDocs]);

  /* ─── Handle upload: camera-only vs choice ─── */
  const handleUpload = useCallback(async (docType: DocType, info: DocInfo) => {
    if (!userId) return;

    if (info.cameraOnly) {
      // SELFIE: always use real-time camera (front-facing)
      const ok = await requestCameraPermission();
      if (!ok) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        cameraType: ImagePicker.CameraType.front,
      });
      if (!result.canceled && result.assets[0]) {
        await uploadImage(docType, result.assets[0].uri);
      }
    } else {
      // CNIB / CASIER: let user choose between camera and gallery
      Alert.alert(
        'Source de la photo',
        'Comment souhaitez-vous ajouter ce document ?',
        [
          {
            text: '📷 Prendre une photo',
            onPress: async () => {
              const ok = await requestCameraPermission();
              if (!ok) return;
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.75,
              });
              if (!result.canceled && result.assets[0]) {
                await uploadImage(docType, result.assets[0].uri);
              }
            },
          },
          {
            text: '🖼 Depuis la galerie',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.75,
              });
              if (!result.canceled && result.assets[0]) {
                await uploadImage(docType, result.assets[0].uri);
              }
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    }
  }, [userId, requestCameraPermission, uploadImage]);

  /* ─── Overall status ─── */
  const allApproved  = Object.values(docs).every((d) => d?.status === 'approved');
  const anyRejected  = Object.values(docs).some((d) => d?.status === 'rejected');
  const anyPending   = Object.values(docs).some((d) => d?.status === 'pending');
  const allSubmitted = Object.values(docs).every((d) => !!d);
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
            Obligatoire pour réserver ou publier des trajets. Nos équipes examinent votre dossier sous 24–48h.
          </Text>
        </View>

        {/* Mandatory notice */}
        {noneSubmitted && (
          <GlassCard variant="warm" style={styles.mandatoryBanner}>
            <AlertCircle size={18} color={Colors.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mandatoryTitle}>Action requise</Text>
              <Text style={styles.mandatoryText}>
                Soumettez les 3 documents ci-dessous pour accéder à toutes les fonctionnalités.
              </Text>
            </View>
          </GlassCard>
        )}

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
                  Tous vos documents ont été approuvés 🎉 Vous pouvez maintenant utiliser tous les services.
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
                  {allSubmitted
                    ? 'Tous vos documents sont en cours de vérification (24–48h).'
                    : 'Certains documents sont en attente. Complétez les documents manquants.'}
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
                      {info.cameraOnly && (
                        <View style={styles.cameraOnlyBadge}>
                          <Camera size={10} color={Colors.primary} />
                          <Text style={styles.cameraOnlyText}>Photo en temps réel uniquement</Text>
                        </View>
                      )}
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
                      <Image source={{ uri: doc.file_url }} style={styles.previewImage} contentFit="cover" />
                    </View>
                  ) : null}

                  {/* Upload / Re-upload button */}
                  {(status === 'none' || status === 'rejected') && (
                    <Pressable
                      onPress={() => handleUpload(info.type, info)}
                      disabled={isUploading}
                      style={[styles.uploadBtn, { borderColor: `${info.color}40` }]}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color={info.color} />
                      ) : info.cameraOnly ? (
                        <Camera size={16} color={info.color} />
                      ) : (
                        <Upload size={16} color={info.color} />
                      )}
                      <Text style={[styles.uploadBtnText, { color: info.color }]}>
                        {isUploading
                          ? 'Envoi en cours…'
                          : info.cameraOnly
                          ? 'Prendre le selfie maintenant'
                          : status === 'rejected'
                          ? 'Renvoyer le document'
                          : 'Ajouter le document'}
                      </Text>
                    </Pressable>
                  )}

                  {status === 'pending' && (
                    <Pressable
                      onPress={() => handleUpload(info.type, info)}
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
                  1. Prenez votre selfie en temps réel avec la caméra frontale.{'\n'}
                  2. Ajoutez votre CNIB et casier judiciaire (photo ou galerie).{'\n'}
                  3. Nos équipes vérifient votre dossier sous 24–48h.{'\n'}
                  4. Vous obtenez le badge vérifié et l'accès complet.
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
  pageHeader: { alignItems: 'center' as const, marginBottom: 18, gap: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800' as const, color: Colors.text },
  pageSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const, lineHeight: 20 },

  mandatoryBanner: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, marginBottom: 14 },
  mandatoryTitle: { fontSize: 13, fontWeight: '700' as const, color: Colors.orange, marginBottom: 4 },
  mandatoryText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  statusBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 14 },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },

  docCard: { marginBottom: 14 },
  docHeader: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12, marginBottom: 12 },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
  docTitleWrap: { flex: 1 },
  docLabel: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  docDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },

  cameraOnlyBadge: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    marginTop: 5, backgroundColor: 'rgba(33,150,243,0.10)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' as const,
  },
  cameraOnlyText: { fontSize: 10, fontWeight: '600' as const, color: Colors.primary },

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
    borderRadius: 12, paddingVertical: 14,
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600' as const },

  infoCard: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10 },
  infoTitle: { fontSize: 13, fontWeight: '700' as const, color: Colors.orange, marginBottom: 6 },
  infoText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 20 },
});
