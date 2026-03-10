import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

function SkeletonPulse({ width, height = 12, borderRadius, style }: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: borderRadius ?? height / 2,
          backgroundColor: 'rgba(33, 150, 243, 0.22)',
          opacity,
        },
        style,
      ]}
    />
  );
}

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      {/* Type tag */}
      <SkeletonPulse width={70} height={18} borderRadius={6} style={styles.mb10} />

      {/* Route + price */}
      <View style={styles.routeRow}>
        <View style={styles.routeInfo}>
          <SkeletonPulse width="75%" height={15} style={styles.mb8} />
          <SkeletonPulse width="55%" height={15} />
        </View>
        <View style={styles.priceArea}>
          <SkeletonPulse width={60} height={22} />
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsRow}>
        <SkeletonPulse width={110} height={12} />
        <SkeletonPulse width={85} height={12} />
      </View>

      {/* Driver */}
      <View style={styles.driverRow}>
        <View style={styles.avatarSkeleton} />
        <View style={styles.driverInfo}>
          <SkeletonPulse width="45%" height={12} style={styles.mb6} />
          <SkeletonPulse width="30%" height={10} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.10)',
  },
  mb10: { marginBottom: 10 },
  mb8: { marginBottom: 8 },
  mb6: { marginBottom: 6 },
  routeRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
    gap: 12,
  },
  routeInfo: { flex: 1 },
  priceArea: { alignItems: 'flex-end' as const },
  detailsRow: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33, 150, 243, 0.08)',
  },
  driverRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  avatarSkeleton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(33, 150, 243, 0.22)',
  },
  driverInfo: { flex: 1 },
});
