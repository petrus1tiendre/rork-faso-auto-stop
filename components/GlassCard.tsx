import React from 'react';
import { StyleSheet, View, ViewStyle, Pressable, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'accent' | 'warm';
}

export default React.memo(function GlassCard({ children, style, onPress, variant = 'default' }: GlassCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = React.useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = React.useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();
  }, [scaleAnim]);

  const gradientColors = React.useMemo((): [string, string, string] => {
    switch (variant) {
      case 'accent':
        return ['rgba(167, 139, 250, 0.18)', 'rgba(255, 255, 255, 0.82)', 'rgba(224, 187, 228, 0.12)'];
      case 'warm':
        return ['rgba(255, 153, 51, 0.10)', 'rgba(255, 255, 255, 0.82)', 'rgba(255, 220, 180, 0.08)'];
      default:
        return ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.78)', 'rgba(248, 244, 251, 0.70)'];
    }
  }, [variant]);

  const borderColor = React.useMemo(() => {
    switch (variant) {
      case 'accent':
        return 'rgba(167, 139, 250, 0.30)';
      case 'warm':
        return 'rgba(255, 153, 51, 0.25)';
      default:
        return Colors.glassBorder;
    }
  }, [variant]);

  const content = (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.card, { borderColor }, style]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.highlight} />
        <View style={styles.innerGlow} />
        {children}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(125, 60, 152, 0.15)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
      web: {
        shadowColor: 'rgba(125, 60, 152, 0.15)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
    }),
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  highlight: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
  },
  innerGlow: {
    position: 'absolute' as const,
    top: 1,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});
