import { useAppAuth } from "@/components/auth-provider";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, BarChart2, Bell, CreditCard, PieChart, Zap } from "lucide-react-native";
import React from "react";
import { Alert, Dimensions, Image, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// 1. Header Component
function Header() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isSignedIn, signOut } = useAppAuth();

  return (
    <View
      className="w-full z-50 bg-white border-b border-cardBorder shadow-sm"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Image source={require("../../assets/logo.png")} style={{ height: 40, width: 140 }} resizeMode="contain" />
        </View>
        <View className="flex-row items-center gap-3">
          {isSignedIn ? (
            <>
              <TouchableOpacity
                onPress={() => {
                  console.log("Welcome page Dashboard header button clicked");
                  router.push("/(tabs)");
                }}
                style={{ padding: 10, zIndex: 99 }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text className="text-sm font-semibold text-primary">Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  console.log("Welcome page Sign out button clicked");
                  signOut();
                }}
                style={{ paddingVertical: 8, paddingHorizontal: 16, zIndex: 99 }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                className="bg-accent rounded-full"
              >
                <Text className="text-sm font-semibold text-white">Sign out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
                <Text className="text-sm font-semibold text-textMuted">Log in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/sign-up")}
                className="bg-primary px-4 py-2 rounded-full"
              >
                <Text className="text-sm font-semibold text-white">Sign up</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// 2. Hero Component (Headline, description, and CTA button grouped as a whole)
function HeroSection() {
  const router = useRouter();
  const { signIn, isSignedIn } = useAppAuth();

  return (
    <LinearGradient
      colors={["#E3EFF2", "#F2F7F8", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ paddingTop: 48 }}
      className="relative items-center justify-center px-6 pb-20 overflow-hidden"
    >
      {/* Background Image overlay */}
      <View className="absolute inset-0 opacity-[0.06]">
        <Image
          source={require("../../assets/banner.png")}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>


      <View className="z-10 items-center">
        <Text className="text-4xl font-extrabold text-primary text-center leading-[48px] tracking-tight mb-4">
          Intelligent Finance{"\n"}
          <Text className="text-accent">Management</Text> Platform
        </Text>
        <Text className="text-base text-textMuted text-center mb-10 max-w-[320px] leading-relaxed font-normal">
          An AI-powered personalized finance platform that helps you track, analyze, and optimize your spending with real-time insights.
        </Text>

        {isSignedIn ? (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            className="flex-row items-center bg-primary px-8 py-4 rounded-full"
            style={{
              shadowColor: "#1B2D36",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <Text className="text-white font-bold text-lg mr-2">Go to Dashboard</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-up")}
              className="flex-row items-center bg-primary px-8 py-4 rounded-full"
              style={{
                shadowColor: "#1B2D36",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              <Text className="text-white font-bold text-lg mr-2">Get Started Free</Text>
              <ArrowRight size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await signIn("demo@finsight.com");
                  router.replace("/(tabs)");
                } catch (err) {
                  console.error("Mock login error:", err);
                }
              }}
              className="mt-6"
            >
              <Text className="text-textMuted text-xs font-semibold underline">Mock Dashboard</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

// 3. How It Works Component
function HowItWorksSection() {
  return (
    <View className="py-16 px-4 bg-[#F8FBFC80] relative overflow-hidden">

      <View className="items-center mb-12">
        <Text className="text-3xl font-bold text-primary mb-3">How It Works</Text>
        <Text className="text-base text-textMuted text-center px-4">
          Get started in three simple steps and take control of your finances
        </Text>
      </View>

      <View className="gap-8 px-2">
        {/* Step 1 */}
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-cardBorder items-center relative">
          <View className="absolute -top-5 w-10 h-10 rounded-full border-4 border-white shadow-md bg-white">
            <LinearGradient
              colors={["#1B2D36", "#C99B61"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-white font-bold text-center">1</Text>
            </LinearGradient>
          </View>
          <View className="w-16 h-16 rounded-2xl bg-lightBg items-center justify-center mb-4 mt-2">
            <CreditCard size={32} color="#1B2D36" />
          </View>
          <Text className="text-xl font-bold text-primary mb-2 text-center">Create Your Profile</Text>
          <Text className="text-center text-textMuted text-sm">
            Get started in seconds by setting up your profile and adding your bank accounts.
          </Text>
        </View>

        {/* Step 2 */}
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-cardBorder items-center relative">
          <View className="absolute -top-5 w-10 h-10 rounded-full border-4 border-white shadow-md bg-white">
            <LinearGradient
              colors={["#1B2D36", "#C99B61"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-white font-bold text-center">2</Text>
            </LinearGradient>
          </View>
          <View className="w-16 h-16 rounded-2xl bg-lightBg items-center justify-center mb-4 mt-2">
            <BarChart2 size={32} color="#1B2D36" />
          </View>
          <Text className="text-xl font-bold text-primary mb-2 text-center">Track & Categorize</Text>
          <Text className="text-center text-textMuted text-sm">
            Log daily expenses and watch as FinSight automatically organizes them with AI.
          </Text>
        </View>

        {/* Step 3 */}
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-cardBorder items-center relative">
          <View className="absolute -top-5 w-10 h-10 rounded-full border-4 border-white shadow-md bg-white">
            <LinearGradient
              colors={["#1B2D36", "#C99B61"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-white font-bold text-center">3</Text>
            </LinearGradient>
          </View>
          <View className="w-16 h-16 rounded-2xl bg-lightBg items-center justify-center mb-4 mt-2">
            <PieChart size={32} color="#1B2D36" />
          </View>
          <Text className="text-xl font-bold text-primary mb-2 text-center">Optimize with AI</Text>
          <Text className="text-center text-textMuted text-sm">
            Receive automated weekly reports and personalized insights to spend smarter.
          </Text>
        </View>
      </View>
    </View>
  );
}

// 4. Features Component
function FeaturesSection() {
  return (
    <View className="py-16 px-4">
      <View className="items-center mb-10">
        <Text className="text-2xl font-bold text-primary mb-3 text-center">Everything you need to manage finances</Text>
        <Text className="text-sm text-textMuted text-center px-4">
          Powerful AI-driven features designed to help you take control
        </Text>
      </View>

      <View className="gap-4">
        <View className="bg-lightBg rounded-3xl p-6 border border-cardBorder">
          <Text className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Optimization</Text>
          <Text className="text-xl font-bold text-primary mb-2">Intelligent Budgeting</Text>
          <Text className="text-sm text-textMuted mb-6">Create adaptive budgets that learn from your habits. Get real-time alerts.</Text>
          <PieChart size={24} color="#1B2D36" />
        </View>

        <View className="bg-primary rounded-3xl p-6 border border-secondary">
          <Text className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Gemini AI</Text>
          <Text className="text-xl font-bold text-white mb-2">Deep AI Analytics</Text>
          <Text className="text-sm text-[#ffffffcc] mb-6">Leverage Gemini AI to decode your financial DNA and spot hidden trends.</Text>
          <Zap size={24} color="#C99B61" />
        </View>

        <View className="bg-white rounded-3xl p-6 border border-cardBorder shadow-sm">
          <Text className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Protection</Text>
          <Text className="text-xl font-bold text-primary mb-2">Smart Budget Alerts</Text>
          <Text className="text-sm text-textMuted mb-6">FinSight monitors your spending across categories. Receive instant alerts.</Text>
          <Bell size={24} color="#C99B61" />
        </View>
      </View>
    </View>
  );
}

// 5. CTA Component
function CTASection() {
  const router = useRouter();

  return (
    <View className="mx-4 my-8 rounded-3xl overflow-hidden shadow-xl bg-primary">
      <LinearGradient
        colors={['#1B2D36', '#122129', '#081318']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', position: 'relative' }}
      >
        {/* Smooth gradient glow overlay */}
        <View className="absolute -top-10 -right-10 w-48 h-48 overflow-hidden rounded-full">
          <LinearGradient
            colors={["#C99B6133", "transparent"]}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
        <Text className="text-3xl font-bold text-white text-center mb-4 leading-tight">
          Ready to Transform{"\n"}
          <Text className="text-accent">Your Finances?</Text>
        </Text>
        <Text className="text-sm text-[#ffffffcc] text-center mb-8 max-w-[280px]">
          Achieve smarter financial management with AI-powered insights.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/sign-up")}
          className="bg-white px-8 py-4 rounded-full flex-row items-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text className="text-primary font-bold text-lg mr-2">Let&apos;s Get Started</Text>
          <ArrowRight size={20} color="#1B2D36" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// 6. Footer Component
function FooterSection() {
  const handlePrivacyPress = () => {
    Alert.alert(
      "Privacy Policy",
      "FinSight is committed to protecting your personal and financial data. We secure your information using industry-standard encryption, and your transactional details are processed locally or securely synced depending on your preferences. We never sell your personal data to third parties.",
      [{ text: "Close", style: "cancel" }]
    );
  };

  const handleTermsPress = () => {
    Alert.alert(
      "Terms of Service",
      "Welcome to FinSight. By using our application, you agree to comply with our terms. We provide AI-powered financial tracking and optimization insights. You are responsible for ensuring the accuracy of any manual transactions logged and securing your account credentials.",
      [{ text: "Close", style: "cancel" }]
    );
  };

  const handleContactPress = () => {
    Alert.alert(
      "Contact Support",
      "Need help or have feedback? Reach out to our team at support@finsight.com or tap below to email us directly.",
      [
        {
          text: "Send Email",
          onPress: () => {
            Linking.openURL("mailto:support@finsight.com").catch((err) =>
              Alert.alert("Error", "Could not open email client: " + err.message)
            );
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <View className="pt-16 pb-8 items-center border-t border-cardBorder mt-16 bg-[#F8FBFC4d]">
      <View className="flex-row gap-6 mb-4">
        <TouchableOpacity onPress={handlePrivacyPress} activeOpacity={0.7}>
          <Text className="text-textMuted font-medium">Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleTermsPress} activeOpacity={0.7}>
          <Text className="text-textMuted font-medium">Terms</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleContactPress} activeOpacity={0.7}>
          <Text className="text-textMuted font-medium">Contact</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-textMuted text-xs">© 2026 FinSight. All rights reserved.</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const { isSignedIn } = useAppAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  React.useEffect(() => {
    if (isSignedIn && params.from !== "home") {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, params.from]);

  return (
    <View className="flex-1 bg-white">
      <Header />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <CTASection />
        <FooterSection />
      </ScrollView>
    </View>
  );
}
