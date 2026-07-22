import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAppAuth } from "@/components/auth-provider";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ReanimatedLogLevel, configureReanimatedLogger } from "react-native-reanimated";
import "../global.css"; // Import global tailwind stylesheet


// Suppress Reanimated strict mode warnings in console output
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAppAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    console.log("RouteGuard useEffect triggered:", { isSignedIn, segments, navigationStateReady: !!navigationState?.key });
    if (!navigationState?.key) return;

    // Prevent redirect loops
    const currentSegment = (segments as any)[0];
    const segmentsLength = (segments as any).length;
    const inAuthGroup = currentSegment === ("(auth)" as any);
    const inTabsGroup = currentSegment === ("(tabs)" as any);
    
    console.log("RouteGuard segments analysis:", { currentSegment, segmentsLength, inAuthGroup, inTabsGroup });

    if (!isSignedIn && inTabsGroup) {
      console.log("RouteGuard redirecting: signed out and in tabs -> replacing with /welcome");
      router.replace("/welcome");
    } else if (isSignedIn && inAuthGroup) {
      console.log("RouteGuard redirecting: signed in and in auth -> replacing with /(tabs)");
      router.replace("/(tabs)");
    }
  }, [isSignedIn, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <AuthProvider>
            <ToastProvider>
              <RouteGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="welcome" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                </Stack>
              </RouteGuard>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
