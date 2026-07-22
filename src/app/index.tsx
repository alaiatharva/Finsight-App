import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppAuth } from "@/components/auth-provider";

export default function IndexRedirect() {
  const router = useRouter();
  const { isSignedIn } = useAppAuth();

  useEffect(() => {
    if (isSignedIn) {
      console.log("Index: User is signed in, redirecting to dashboard");
      router.replace("/(tabs)");
    } else {
      console.log("Index: User is signed out, redirecting to welcome screen");
      router.replace("/welcome");
    }
  }, [isSignedIn]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#white" }}>
      <ActivityIndicator size="large" color="#32484F" />
    </View>
  );
}
