import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

export const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5; // odd number so center is clear
export const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export interface WheelItem {
  label: string;
  value: number | string;
}

interface WheelPickerProps {
  items: WheelItem[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  width?: number;
}

/** Build a padded array so first & last real items can sit at center */
function buildPadded(items: WheelItem[]): WheelItem[] {
  const pad: WheelItem = { label: '', value: '__pad__' };
  const half = Math.floor(VISIBLE_ITEMS / 2); // 2
  return [
    ...Array(half).fill(pad),
    ...items,
    ...Array(half).fill(pad),
  ];
}

export default function WheelPicker({
  items,
  selectedIndex,
  onIndexChange,
  width = 80,
}: WheelPickerProps) {
  const listRef = useRef<FlatList<WheelItem>>(null);
  const paddedItems = buildPadded(items);
  const half = Math.floor(VISIBLE_ITEMS / 2); // 2
  // real item is at paddedIndex = selectedIndex + half
  const scrollTarget = selectedIndex + half;

  // Scroll to current selection without animation on mount / external change
  useEffect(() => {
    listRef.current?.scrollToIndex({
      index: scrollTarget,
      animated: false,
      viewOffset: 0,
      viewPosition: 0.5,
    });
  }, [scrollTarget]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const paddedIdx = Math.round(offsetY / ITEM_HEIGHT);
      const realIdx = Math.max(0, Math.min(paddedIdx - half, items.length - 1));
      if (realIdx !== selectedIndex) {
        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onIndexChange(realIdx);
      }
    },
    [half, items.length, selectedIndex, onIndexChange]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: WheelItem; index: number }) => {
      const realIdx = index - half;
      const isSelected = realIdx === selectedIndex;
      const isPad = item.value === '__pad__';
      return (
        <View style={styles.item}>
          {!isPad && (
            <Text
              style={[
                styles.itemText,
                isSelected && styles.selectedText,
                !isSelected && styles.dimText,
              ]}
            >
              {item.label}
            </Text>
          )}
        </View>
      );
    },
    [half, selectedIndex]
  );

  return (
    <View style={[styles.wrapper, { width, height: PICKER_HEIGHT }]}>
      {/* Highlight band behind center row */}
      <View
        style={[
          styles.highlight,
          { top: ITEM_HEIGHT * half, height: ITEM_HEIGHT },
        ]}
        pointerEvents="none"
      />
      {/* Fade masks */}
      <View style={[styles.fadeMask, styles.fadeTop]} pointerEvents="none" />
      <View style={[styles.fadeMask, styles.fadeBottom]} pointerEvents="none" />

      <FlatList
        ref={listRef}
        data={paddedItems}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        // Prevent scrolling padding items by clamping initial offset
        initialScrollIndex={scrollTarget}
        // scrollToIndexFailed: silently fallback
        onScrollToIndexFailed={() => {
          listRef.current?.scrollToOffset({
            offset: scrollTarget * ITEM_HEIGHT,
            animated: false,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  itemText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  selectedText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  dimText: {
    color: Colors.textMuted,
  },
  highlight: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(33, 150, 243, 0.10)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.25)',
    borderRadius: 10,
    zIndex: 1,
  },
  fadeMask: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 2,
    pointerEvents: 'none' as const,
  },
  fadeTop: {
    top: 0,
    // gradient-like fade via background (not LinearGradient to avoid extra dep here)
    backgroundColor: 'rgba(242, 247, 255, 0.82)',
  },
  fadeBottom: {
    bottom: 0,
    backgroundColor: 'rgba(242, 247, 255, 0.82)',
  },
});
