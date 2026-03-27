import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({ toast, onDone }: { toast: ToastMessage; onDone: (id: string) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 300, useNativeDriver: true }),
      ]).start(() => onDone(toast.id));
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

  const bgColor =
    toast.type === 'success'
      ? Colors.green
      : toast.type === 'error'
      ? Colors.danger
      : Colors.primary;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );
}

function ToastContainer({ toasts, onDone }: { toasts: ToastMessage[]; onDone: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;
  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={onDone} />
      ))}
    </View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDone={remove} />
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'stretch' as const,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
