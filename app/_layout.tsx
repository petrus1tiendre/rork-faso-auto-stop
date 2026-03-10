import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useApp } from "@/providers/AppProvider";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { ToastProvider } from "@/components/Toast";
import AsyncStorage from "@react-native-async-storage/async-storage";

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, authLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('faso_autostop_onboarded').then((val) => {
      setOnboardingDone(!!val);
    });
  }, []);

  useEffect(() => {
    if (authLoading || onboardingDone === null) return;

    const inAuthGroup   = segments[0] === 'login' || segments[0] === 'register';
    const inOnboarding  = segments[0] === 'onboarding';

    if (!session && !inAuthGroup && !inOnboarding) {
      if (!onboardingDone) {
        router.replace('/onboarding');
      } else {
        router.replace('/login');
      }
    } else if (session && (inAuthGroup || inOnboarding)) {
      router.replace('/');
    }
  }, [session, authLoading, segments, router, onboardingDone]);

  if (authLoading || onboardingDone === null) {
    return (
      <View style={authStyles.loading}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const authStyles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
});

function RootLayoutNav() {
  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="trip-details" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="profile-verification" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="bulletin" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="my-trips" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="notifications-settings" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="help" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="report-issue" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="admin" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 30 * 1000,
      },
    },
  }));

  useEffect(() => {
    const timer = setTimeout(() => SplashScreen.hideAsync(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <ToastProvider>
            <RootLayoutNav />
          </ToastProvider>
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
