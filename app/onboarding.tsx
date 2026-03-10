import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
  Dimensions, FlatList, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');
export const ONBOARDING_KEY = 'faso_autostop_onboarded';

const slides = [
  {
    id: '1',
    emoji: '🚗',
    title: 'Voyagez ensemble',
    subtitle: 'Trouvez un trajet ou proposez le vôtre en quelques secondes',
    gradient: [Colors.primary, Colors.primaryDark] as [string, string],
    bg: 'rgba(33, 150, 243, 0.08)',
  },
  {
    id: '2',
    emoji: '💰',
    title: 'Partagez les frais',
    subtitle: "Économisez sur l'essence entre Ouaga et Bobo-Dioulasso",
    gradient: [Colors.green, Colors.greenDark] as [string, string],
    bg: 'rgba(0, 168, 107, 0.08)',
  },
  {
    id: '3',
    emoji: '🔒',
    title: 'Voyagez en sécurité',
    subtitle: 'Profils vérifiés et bulletin N°3 obligatoire pour tous les conducteurs',
    gradient: [Colors.orange, '#e07820'] as [string, string],
    bg: 'rgba(255, 153, 51, 0.08)',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  const goTo = useCallback((idx: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    setCurrentIndex(idx);
  }, [fadeAnim]);

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/login');
  }, [router]);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      goTo(currentIndex + 1);
    } else {
      handleFinish();
    }
  }, [currentIndex, goTo, handleFinish]);

  const slide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button */}
      {currentIndex < slides.length - 1 && (
        <Pressable onPress={handleFinish} style={styles.skipButton}>
          <Text style={styles.skipText}>Passer</Text>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { width }]}>
            <Animated.View style={[styles.slideContent, { opacity: index === currentIndex ? fadeAnim : 1 }]}>
              {/* Illustration circle */}
              <View style={[styles.emojiCircle, { backgroundColor: item.bg }]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            </Animated.View>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, idx) => (
          <Pressable key={idx} onPress={() => goTo(idx)} hitSlop={12}>
            <View style={[styles.dot, idx === currentIndex && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      {/* CTA Button */}
      <View style={styles.buttonContainer}>
        <Pressable onPress={handleNext} style={styles.nextButton}>
          <LinearGradient
            colors={slide.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            <Text style={styles.nextText}>
              {currentIndex === slides.length - 1 ? '🚀 Commencer !' : 'Suivant →'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center' as const,
  },
  skipButton: {
    position: 'absolute' as const,
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  slide: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 32,
  },
  slideContent: {
    alignItems: 'center' as const,
    paddingTop: 60,
  },
  emojiCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 40,
    borderWidth: 2,
    borderColor: 'rgba(33, 150, 243, 0.12)',
  },
  emoji: {
    fontSize: 72,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 26,
  },
  dotsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(33, 150, 243, 0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  nextButton: {
    borderRadius: 18,
    overflow: 'hidden' as const,
  },
  nextGradient: {
    paddingVertical: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 18,
  },
  nextText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
