import React, { useState } from "react";
import { View, Text, Pressable, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, PieChart } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAppAuth } from "@/components/auth-provider";

export default function SignUpScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Use context actions and state
  const { 
    signUp, 
    verifySignUp, 
    resendVerification, 
    pendingVerification = false, 
    loading = false 
  } = useAppAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  // Handle initial sign up form submission
  const handleSignUp = async () => {
    if (!name || !email || !password) {
      showToast("Please fill in all register fields", "error");
      return;
    }

    try {
      // Create sign up request and send verification
      await signUp(name, email, password);
      showToast("Verification code sent to your email", "success");
    } catch (err: any) {
      console.error("Clerk Sign Up error:", err);
      const errMsg = err.errors?.[0]?.message || err.message || "Registration failed. Please try again.";
      showToast(errMsg, "error");
    }
  };

  // Handle email verification code submission
  const handleVerify = async () => {
    if (!code) {
      showToast("Please enter the verification code", "error");
      return;
    }

    if (!verifySignUp) {
      showToast("Verification function is unavailable", "error");
      return;
    }

    try {
      await verifySignUp(code);
      showToast("Registration Successful!", "success");
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Clerk Verification error:", err);
      const errMsg = err.errors?.[0]?.message || err.message || "Verification code is incorrect.";
      showToast(errMsg, "error");
    }
  };

  // Resend code trigger
  const handleResend = async () => {
    if (!resendVerification) return;
    try {
      await resendVerification();
      showToast("New code sent!", "success");
    } catch (err: any) {
      console.error("Resend error:", err);
      const errMsg = err.errors?.[0]?.message || err.message || "Failed to resend code.";
      showToast(errMsg, "error");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg px-6 py-6 justify-between">
      {/* Top Header */}
      <View>
        <Pressable 
          onPress={() => router.back()} 
          className="flex-row items-center space-x-1.5 py-3 mb-6"
        >
          <ArrowLeft size={16} className="text-textMuted" />
          <Text className="text-textMuted text-sm font-semibold ml-1">Back</Text>
        </Pressable>

        <View className="items-center mb-8">
          <View className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white mb-4">
            <PieChart size={28} color="white" />
          </View>
          <Text className="text-primary text-2xl font-bold tracking-tight">
            {pendingVerification ? "Verify Email" : "Create Account"}
          </Text>
          <Text className="text-textMuted text-xs mt-1 text-center">
            {pendingVerification 
              ? `We have sent a verification code to ${email}` 
              : "Get started with FinSight tracker today"
            }
          </Text>
        </View>

        {/* Dynamic Panels */}
        {!pendingVerification ? (
          /* Inputs Panel */
          <View className="flex-col gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <Input
              label="Email Address"
              placeholder="e.g. john@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              placeholder="Create password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button 
              variant="default" 
              onPress={handleSignUp} 
              loading={loading}
              className="mt-4 bg-primary rounded-xl py-3 shadow-md shadow-[#32484f1a]"
            >
              Get Started
            </Button>
          </View>
        ) : (
          /* Verification Panel */
          <View className="flex-col gap-4">
            <Input
              label="Verification Code"
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            <Button 
              variant="default" 
              onPress={handleVerify} 
              loading={loading}
              className="mt-4 bg-primary rounded-xl py-3 shadow-md shadow-[#32484f1a]"
            >
              Verify & Complete
            </Button>
            <TouchableOpacity 
              onPress={handleResend} 
              disabled={loading}
              className="items-center py-2"
            >
              <Text className="text-accent font-semibold text-xs underline">
                Resend Code
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom redirection */}
      {!pendingVerification && (
        <View className="items-center mb-6">
          <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
            <Text className="text-textMuted text-xs">
              Already have an account? <Text className="text-accent font-bold">Sign In</Text>
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
