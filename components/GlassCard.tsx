import React from 'react';
import { StyleSheet, View, ViewStyle, Pressable, Animated } from 'react-native';
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
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = React.useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const gradientColors = React.useMemo((): [string, string] => {
    switch (variant) {
      case 'accent':
        return ['rgba(0, 191, 255, 0.12)', 'rgba(0, 191, 255, 0.04)'];
      case 'warm':
        return ['rgba(255, 153, 51, 0.10)', 'rgba(255, 153, 51, 0.03)'];
      default:
        return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'];
    }
  }, [variant]);

  const borderColor = React.useMemo(() => {
    switch (variant) {
      case 'accent':
        return 'rgba(0, 191, 255, 0.20)';
      case 'warm':
        return 'rgba(255, 153, 51, 0.18)';
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
  },
  highlight: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
