/**
 * DateTimeWheelModal
 * A scrollable drum/wheel picker for date (day · month · year) and
 * time (hour · minute) — works on iOS, Android, and Web.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Colors from '@/constants/colors';
import WheelPicker, { WheelItem, PICKER_HEIGHT } from '@/components/WheelPicker';

/* ─── helpers ──────────────────────────────────────────────────── */

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function makeRange(from: number, to: number, pad = 2): WheelItem[] {
  const items: WheelItem[] = [];
  for (let i = from; i <= to; i++) {
    items.push({ label: String(i).padStart(pad, '0'), value: i });
  }
  return items;
}

function makeMonths(): WheelItem[] {
  return MONTHS_FR.map((label, i) => ({ label, value: i }));
}

function makeYears(): WheelItem[] {
  const base = new Date().getFullYear();
  const items: WheelItem[] = [];
  for (let y = base; y <= base + 4; y++) {
    items.push({ label: String(y), value: y });
  }
  return items;
}

/* ─── types ─────────────────────────────────────────────────────── */

export type PickerMode = 'date' | 'time';

interface Props {
  visible: boolean;
  mode: PickerMode;
  value: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

/* ─── component ─────────────────────────────────────────────────── */

export default function DateTimeWheelModal({
  visible,
  mode,
  value,
  minimumDate,
  onConfirm,
  onCancel,
}: Props) {
  // ── local state ──
  const [dayIdx, setDayIdx] = useState(0);
  const [monthIdx, setMonthIdx] = useState(0);
  const [yearIdx, setYearIdx] = useState(0);
  const [hourIdx, setHourIdx] = useState(0);
  const [minIdx, setMinIdx] = useState(0);

  // Precomputed item arrays
  const yearItems = makeYears();
  const monthItems = makeMonths();
  const [dayItems, setDayItems] = useState<WheelItem[]>([]);
  const hourItems = makeRange(0, 23);
  const minItems = makeRange(0, 59);

  // Sync state with `value` whenever the modal becomes visible
  useEffect(() => {
    if (!visible) return;
    const d = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth(); // 0-based
    const currentDay = d.getDate();   // 1-based

    const yIdx = yearItems.findIndex((y) => y.value === currentYear);
    setYearIdx(yIdx >= 0 ? yIdx : 0);
    setMonthIdx(currentMonth);

    const days = makeDays(currentMonth, currentYear);
    setDayItems(days);
    const dIdx = days.findIndex((item) => item.value === currentDay);
    setDayIdx(dIdx >= 0 ? dIdx : 0);

    setHourIdx(d.getHours());
    setMinIdx(d.getMinutes());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function makeDays(month: number, year: number): WheelItem[] {
    const count = daysInMonth(month, year);
    return makeRange(1, count, 2);
  }

  // Rebuild days when month or year changes
  const handleMonthChange = useCallback(
    (idx: number) => {
      setMonthIdx(idx);
      const selectedYear = yearItems[yearIdx]?.value as number ?? new Date().getFullYear();
      const newDays = makeDays(idx, selectedYear);
      setDayItems(newDays);
      if (dayIdx >= newDays.length) setDayIdx(newDays.length - 1);
    },
    [yearIdx, yearItems, dayIdx]
  );

  const handleYearChange = useCallback(
    (idx: number) => {
      setYearIdx(idx);
      const selectedYear = yearItems[idx]?.value as number ?? new Date().getFullYear();
      const newDays = makeDays(monthIdx, selectedYear);
      setDayItems(newDays);
      if (dayIdx >= newDays.length) setDayIdx(newDays.length - 1);
    },
    [monthIdx, dayIdx, yearItems]
  );

  const handleConfirm = useCallback(() => {
    let result: Date;
    if (mode === 'date') {
      const year = yearItems[yearIdx]?.value as number ?? new Date().getFullYear();
      const month = monthIdx; // 0-based
      const day = (dayItems[dayIdx]?.value as number) ?? 1;
      result = new Date(year, month, day, 12, 0, 0); // noon to avoid TZ shifts
      // Enforce minimumDate
      if (minimumDate) {
        const minMidnight = new Date(
          minimumDate.getFullYear(),
          minimumDate.getMonth(),
          minimumDate.getDate()
        );
        if (result < minMidnight) result = minMidnight;
      }
    } else {
      result = new Date(value);
      result.setHours(hourIdx, minIdx, 0, 0);
    }
    onConfirm(result);
  }, [mode, yearItems, yearIdx, monthIdx, dayItems, dayIdx, hourIdx, minIdx, value, minimumDate, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel} />

      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancelBtn}>Annuler</Text>
          </Pressable>
          <Text style={styles.title}>
            {mode === 'date' ? 'Choisir une date' : "Choisir l'heure"}
          </Text>
          <Pressable onPress={handleConfirm} hitSlop={10}>
            <Text style={styles.confirmBtn}>Confirmer</Text>
          </Pressable>
        </View>

        {/* Wheels */}
        <View style={styles.wheelsRow}>
          {mode === 'date' ? (
            <>
              {/* Day */}
              <WheelPicker
                items={dayItems}
                selectedIndex={dayIdx}
                onIndexChange={setDayIdx}
                width={60}
              />
              {/* Month */}
              <WheelPicker
                items={monthItems}
                selectedIndex={monthIdx}
                onIndexChange={handleMonthChange}
                width={130}
              />
              {/* Year */}
              <WheelPicker
                items={yearItems}
                selectedIndex={yearIdx}
                onIndexChange={handleYearChange}
                width={80}
              />
            </>
          ) : (
            <>
              {/* Hour */}
              <WheelPicker
                items={hourItems}
                selectedIndex={hourIdx}
                onIndexChange={setHourIdx}
                width={80}
              />
              <Text style={styles.timeSep}>:</Text>
              {/* Minute */}
              <WheelPicker
                items={minItems}
                selectedIndex={minIdx}
                onIndexChange={setMinIdx}
                width={80}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const SHEET_PADDING_BOTTOM = Platform.OS === 'ios' ? 34 : 16;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#F2F7FF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: SHEET_PADDING_BOTTOM,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33, 150, 243, 0.10)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  cancelBtn: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    minWidth: 72,
  },
  confirmBtn: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primary,
    minWidth: 72,
    textAlign: 'right' as const,
  },
  wheelsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: PICKER_HEIGHT,
    paddingHorizontal: 10,
    gap: 4,
  },
  timeSep: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 4,
    width: 18,
    textAlign: 'center' as const,
  },
});
