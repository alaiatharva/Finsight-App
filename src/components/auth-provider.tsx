import React, { createContext, useContext, useState } from "react";
import { 
  ClerkProvider, 
  useAuth as useClerkAuth, 
  useUser as useClerkUser,
  useSignIn,
  useSignUp
} from "@clerk/clerk-expo";
import { tokenCache } from "@/lib/token-cache";

const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
// Added trim() to resolve carriage return (\r) issue from Windows .env files
const CLERK_PUBLISHABLE_KEY = 
  rawKey && rawKey !== "undefined" && rawKey !== "null" ? rawKey.trim() : "";

console.log("AUTH_PROVIDER: CLERK_PUBLISHABLE_KEY length:", CLERK_PUBLISHABLE_KEY.length);
if (CLERK_PUBLISHABLE_KEY) {
  console.log("AUTH_PROVIDER: CLERK_PUBLISHABLE_KEY prefix:", CLERK_PUBLISHABLE_KEY.substring(0, 15));
} else {
  console.log("AUTH_PROVIDER: CLERK_PUBLISHABLE_KEY is empty/invalid");
}

interface AppAuthContextType {
  isSignedIn: boolean;
  user: { fullName: string; email: string } | null;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (name: string, email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isClerk: boolean;
  pendingVerification?: boolean;
  verifySignUp?: (code: string) => Promise<void>;
  verifySignIn?: (code: string) => Promise<void>;
  resendVerification?: () => Promise<void>;
  loading?: boolean;
  authMode?: "signin" | "signup";
}

const MockAuthContext = createContext<AppAuthContextType | undefined>(undefined);
const ClerkBridgeContext = createContext<AppAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // If Clerk publishable key is configured, integrate ClerkProvider
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <ClerkBridgeProvider>{children}</ClerkBridgeProvider>
      </ClerkProvider>
    );
  }

  // Fallback to offline mock session provider
  return <MockProvider>{children}</MockProvider>;
}

function ClerkBridgeProvider({ children }: { children: React.ReactNode }) {
  const { userId, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const { signIn: clerkSignIn, isLoaded: signInLoaded, setActive: setSignInActive } = useSignIn();
  const { signUp: clerkSignUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp();

  const [mockSignedIn, setMockSignedIn] = useState(false);
  const [mockUser, setMockUser] = useState<{ fullName: string; email: string } | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const value: AppAuthContextType = {
    isSignedIn: !!userId || mockSignedIn,
    user: clerkUser 
      ? { fullName: clerkUser.fullName || "User", email: clerkUser.primaryEmailAddress?.emailAddress || "" } 
      : mockUser,
    isClerk: true,
    pendingVerification,
    loading,
    authMode,
    
    signIn: async (email: string, password?: string) => {
      if (email === "demo@finsight.com") {
        setLoading(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          setMockUser({ fullName: "Demo Admin", email });
          setMockSignedIn(true);
        } finally {
          setLoading(false);
        }
        return;
      }
      if (!signInLoaded) return;
      setLoading(true);
      try {
        const completeSignIn = await clerkSignIn.create({
          identifier: email,
          password: password || "",
        });

        if (completeSignIn.status === "complete") {
          await setSignInActive({ session: completeSignIn.createdSessionId });
        } else if (completeSignIn.status === "needs_client_trust") {
          // Prepare the email verification code factor for device verification by extracting emailAddressId
          const emailCodeFactor = completeSignIn.supportedFirstFactors?.find(
            (factor: any) => factor.strategy === "email_code"
          );
          if (emailCodeFactor && emailCodeFactor.emailAddressId) {
            await clerkSignIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailCodeFactor.emailAddressId,
            });
          } else {
            await clerkSignIn.prepareFirstFactor({ strategy: "email_code" });
          }
          setAuthMode("signin");
          setPendingVerification(true);
        } else {
          throw new Error(`Sign in status pending: ${completeSignIn.status}`);
        }
      } finally {
        setLoading(false);
      }
    },

    signUp: async (name: string, email: string, password?: string) => {
      if (!signUpLoaded) return;
      setLoading(true);
      try {
        await clerkSignUp.create({
          emailAddress: email,
          password: password || "",
          firstName: name,
        });
        await clerkSignUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setAuthMode("signup");
        setPendingVerification(true);
      } catch (err) {
        throw err;
      } finally {
        setLoading(false);
      }
    },

    verifySignUp: async (code: string) => {
      if (!signUpLoaded) return;
      setLoading(true);
      try {
        const completeSignUp = await clerkSignUp.attemptEmailAddressVerification({
          code,
        });
        if (completeSignUp.status === "complete") {
          await setSignUpActive({ session: completeSignUp.createdSessionId });
          setPendingVerification(false);
        } else {
          throw new Error(`Verification pending: ${completeSignUp.status}`);
        }
      } finally {
        setLoading(false);
      }
    },

    verifySignIn: async (code: string) => {
      if (!signInLoaded) return;
      setLoading(true);
      try {
        const completeSignIn = await clerkSignIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
        if (completeSignIn.status === "complete") {
          await setSignInActive({ session: completeSignIn.createdSessionId });
          setPendingVerification(false);
        } else {
          throw new Error(`Verification pending: ${completeSignIn.status}`);
        }
      } finally {
        setLoading(false);
      }
    },

    resendVerification: async () => {
      setLoading(true);
      try {
        if (authMode === "signin") {
          if (!signInLoaded) return;
          const emailCodeFactor = clerkSignIn.supportedFirstFactors?.find(
            (factor: any) => factor.strategy === "email_code"
          );
          if (emailCodeFactor && emailCodeFactor.emailAddressId) {
            await clerkSignIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailCodeFactor.emailAddressId,
            });
          } else {
            await clerkSignIn.prepareFirstFactor({ strategy: "email_code" });
          }
        } else {
          if (!signUpLoaded) return;
          await clerkSignUp.prepareEmailAddressVerification({ strategy: "email_code" });
        }
      } finally {
        setLoading(false);
      }
    },

    signOut: async () => {
      setMockSignedIn(false);
      setMockUser(null);
      try {
        await clerkSignOut();
      } catch (err) {
        console.warn("Clerk signOut failed or was called without active session:", err);
      }
    },
  };

  return <ClerkBridgeContext.Provider value={value}>{children}</ClerkBridgeContext.Provider>;
}

function MockProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<{ fullName: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password?: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setUser({ fullName: "Demo Admin", email });
    setIsSignedIn(true);
    setLoading(false);
  };

  const signUp = async (name: string, email: string, password?: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setUser({ fullName: name, email });
    setIsSignedIn(true);
    setLoading(false);
  };

  const signOut = async () => {
    setUser(null);
    setIsSignedIn(false);
  };

  return (
    <MockAuthContext.Provider value={{ 
      isSignedIn, 
      user, 
      signIn, 
      signUp, 
      signOut, 
      isClerk: false, 
      loading,
      pendingVerification: false,
      authMode: "signin",
      verifySignIn: async () => {},
      verifySignUp: async () => {},
      resendVerification: async () => {}
    }}>
      {children}
    </MockAuthContext.Provider>
  );
}

// Consolidated Hook
export function useAppAuth() {
  const mockContext = useContext(MockAuthContext);
  const clerkContext = useContext(ClerkBridgeContext);

  if (CLERK_PUBLISHABLE_KEY) {
    if (!clerkContext) {
      throw new Error("useAppAuth must be used within an AuthProvider");
    }
    return clerkContext;
  }

  if (!mockContext) {
    throw new Error("useAppAuth must be used within an AuthProvider");
  }
  return mockContext;
}
