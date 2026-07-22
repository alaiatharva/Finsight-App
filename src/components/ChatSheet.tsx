import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  Animated,
  Keyboard,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, X } from "lucide-react-native";
import type { ChatMessage } from "@/types";

// Enable LayoutAnimation on Android for smooth keyboard transitions
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─── Quick-action chips ─── */
const QUICK_ACTIONS = [
  { emoji: "💰", label: "Net Worth",      message: "What is my net worth?" },
  { emoji: "📊", label: "Monthly Spent",  message: "How much did I spend this month?" },
  { emoji: "⚠️", label: "Budget Health",  message: "Are my budget limits healthy?" },
  { emoji: "🎯", label: "Savings Goals",  message: "Show my savings goals progress" },
];

/* ─── Props ─── */
export interface ChatSheetProps {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  typing: boolean;
  onSendMessage: (text: string) => void;
}

/* ─── Component ─── */
export function ChatSheet({
  visible,
  onClose,
  messages,
  typing,
  onSendMessage,
}: ChatSheetProps) {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const [shouldRender, setShouldRender] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /* ── Keyboard height tracking ──
     We listen for keyboard show/hide events and store the exact keyboard
     height. This is applied as paddingBottom on the outermost container,
     which pushes the entire flex layout upward. The FlatList (flex:1)
     absorbs the shrinkage, and the input bar stays right above the keyboard.
     This works in Expo Go AND production builds, on both platforms. */
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      if (Platform.OS === "android") {
        LayoutAnimation.configureNext(LayoutAnimation.create(
          150,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ));
      }
      setKeyboardHeight(e.endCoordinates.height);
    });

    const onHide = Keyboard.addListener(hideEvent, () => {
      if (Platform.OS === "android") {
        LayoutAnimation.configureNext(LayoutAnimation.create(
          150,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ));
      }
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  /* ── Open / close animations ── */
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          mass: 0.85,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 800,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible]);

  /* ── Auto-scroll to newest message ── */
  useEffect(() => {
    if (shouldRender && (messages.length > 0 || typing)) {
      const id = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 120);
      return () => clearTimeout(id);
    }
  }, [messages, typing, shouldRender]);

  // Also scroll when keyboard appears
  useEffect(() => {
    if (keyboardHeight > 0 && shouldRender) {
      const id = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
      return () => clearTimeout(id);
    }
  }, [keyboardHeight, shouldRender]);

  /* ── Handlers ── */
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || typing) return;
    setInputText("");
    onSendMessage(text);
  }, [inputText, typing, onSendMessage]);

  const handleQuickAction = useCallback(
    (message: string) => {
      if (typing) return;
      onSendMessage(message);
    },
    [typing, onSendMessage],
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  /* ── Short-circuit render ── */
  if (!shouldRender) return null;

  /* ── Message bubble renderer ── */
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
        <Text style={[s.bubbleText, isUser ? s.textUser : s.textAssistant]}>
          {item.content}
        </Text>
      </View>
    );
  };

  /* ── Typing indicator (FlatList footer) ── */
  const typingFooter = typing ? (
    <View style={[s.bubble, s.bubbleAssistant, { maxWidth: "50%" }]}>
      <Text style={s.typingText}>AI is thinking…</Text>
    </View>
  ) : null;

  // When keyboard is open, remove the bottom safe-area padding (keyboard covers it)
  const bottomPadding = keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 10);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 50 }]}
    >
      {/* Dimmed backdrop */}
      <View style={[StyleSheet.absoluteFill, s.backdrop]} />

      {/*
        Main layout container.
        paddingBottom = keyboard height → pushes the entire sheet up.
        The FlatList (flex:1) absorbs the height loss.
        No KeyboardAvoidingView needed — this works everywhere.
      */}
      <View style={[s.container, { paddingBottom: keyboardHeight }]}>
        {/* Tap-to-close zone above the sheet */}
        <Pressable style={s.closeZone} onPress={handleClose} />

        {/* ── The Sheet Card ── */}
        <Animated.View
          style={[s.card, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Drag handle */}
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>FinSight AI Assistant</Text>
            <Pressable onPress={handleClose} style={s.closeBtn}>
              <X size={16} color="#64748b" />
            </Pressable>
          </View>

          {/* Messages — FlatList with flex:1 fills all remaining space */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={s.list}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={typingFooter}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            keyboardShouldPersistTaps="handled"
          />

          {/* Quick-action chips */}
          {!typing && (
            <View style={s.quickRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.quickContent}
              >
                {QUICK_ACTIONS.map((qa) => (
                  <Pressable
                    key={qa.label}
                    onPress={() => handleQuickAction(qa.message)}
                    style={({ pressed }) => [
                      s.quickPill,
                      pressed && { backgroundColor: "#dce4e5" },
                    ]}
                  >
                    <Text style={s.quickPillText}>
                      {qa.emoji} {qa.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Input bar — anchored to bottom via flex, not absolute positioning */}
          <View style={[s.inputBar, { paddingBottom: bottomPadding }]}>
            <View style={s.inputRow}>
              <TextInput
                style={s.textInput}
                placeholder="Ask FinSight AI…"
                placeholderTextColor="#9ca3af"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                editable={!typing}
                returnKeyType="send"
                multiline={false}
              />
              <Pressable
                onPress={handleSend}
                disabled={typing || !inputText.trim()}
                style={({ pressed }) => [
                  s.sendBtn,
                  (typing || !inputText.trim()) && { opacity: 0.35 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Send size={14} color="white" />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/* ─────────── Styles ─────────── */
const s = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },

  /* Main container — receives paddingBottom: keyboardHeight */
  container: {
    flex: 1,
  },

  /* Transparent press-target above the sheet (≈15 %) */
  closeZone: {
    height: "15%",
  },

  /* The white card that holds everything */
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },

  /* Drag handle */
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Message list */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    flexGrow: 1,
  },

  /* Bubbles */
  bubble: {
    maxWidth: "85%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bubbleUser: {
    backgroundColor: "#32484F",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#EEF6F8",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#DDE4E5",
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 20,
  },
  textUser: {
    color: "#ffffff",
    fontWeight: "500",
  },
  textAssistant: {
    color: "#1e293b",
  },
  typingText: {
    color: "#6E858B",
    fontSize: 13,
    fontWeight: "600",
    fontStyle: "italic",
  },

  /* Quick actions */
  quickRow: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  quickContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  quickPill: {
    backgroundColor: "#EEF6F8",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#DDE4E5",
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },

  /* Input bar */
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE4E5",
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: "#1e293b",
    height: 36,
    paddingVertical: 0,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#32484F",
    alignItems: "center",
    justifyContent: "center",
  },
});
