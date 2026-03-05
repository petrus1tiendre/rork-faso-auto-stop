import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface OfflineBannerProps {
  isOffline: boolean;
  isSyncing?: boolean;
}

export default React.memo(function OfflineBanner({ isOffline, isSyncing }: OfflineBannerProps) {
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOffline ? 0 : -60,
      useNativeDriver: true,
      speed: 12,
      bounciness: 2,
    }).start();
  }, [isOffline, slideAnim]);

  useEffect(() => {
    if (isSyncing) {
      progressAnim.setValue(0);
      Animated.loop(
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        })
      ).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [isSyncing, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <WifiOff size={14} color={Colors.white} />
        <Text style={styles.text}>
          {isSyncing ? 'Synchronisation en cours...' : 'Mode hors ligne'}
        </Text>
      </View>
      {isSyncing && (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(33, 150, 243, 0.88)',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
  },
  text: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    marginTop: 4,
    overflow: 'hidden' as const,
  },
  progressBar: {
    height: 2,
    backgroundColor: Colors.white,
    borderRadius: 1,
  },
});
