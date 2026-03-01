import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0E1A', '#0D1525', '#0A0E1A']}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.title}>Page introuvable</Text>
      <Text style={styles.subtitle}>Cette page n'existe pas</Text>
      <Pressable onPress={() => router.replace('/')} style={styles.button}>
        <Text style={styles.buttonText}>Retour à l'accueil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.background,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
