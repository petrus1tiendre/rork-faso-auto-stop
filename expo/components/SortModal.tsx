import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
} from 'react-native';
import { ArrowUpDown, ArrowUp, ArrowDown, Users, Clock, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { SortType } from '@/types';

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  currentSort: SortType;
  onSelect: (sort: SortType) => void;
}

const sortOptions: { key: SortType; label: string; icon: React.ReactNode }[] = [
  { key: 'recent', label: 'Plus récent', icon: <Clock size={18} color={Colors.primary} /> },
  { key: 'price_asc', label: 'Prix croissant', icon: <ArrowUp size={18} color={Colors.green} /> },
  { key: 'price_desc', label: 'Prix décroissant', icon: <ArrowDown size={18} color={Colors.orange} /> },
  { key: 'seats', label: 'Plus de places', icon: <Users size={18} color={Colors.primary} /> },
];

export default React.memo(function SortModal({ visible, onClose, currentSort, onSelect }: SortModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <ArrowUpDown size={18} color={Colors.primary} />
            <Text style={styles.title}>Trier par</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
          {sortOptions.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => {
                onSelect(option.key);
                onClose();
              }}
              style={[
                styles.option,
                currentSort === option.key && styles.optionActive,
              ]}
            >
              {option.icon}
              <Text style={[
                styles.optionText,
                currentSort === option.key && styles.optionTextActive,
              ]}>
                {option.label}
              </Text>
              {currentSort === option.key && (
                <View style={styles.checkMark}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center' as const,
    marginBottom: 16,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33, 150, 243, 0.08)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  option: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  optionTextActive: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
