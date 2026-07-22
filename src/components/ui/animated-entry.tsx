import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface AnimatedEntryProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  slideDistance?: number;
  className?: string;
}

/**
 * Wraps children in a fade-in + slide-up entrance animation.
 * Used for progressive content reveal on screen load.
 */
export function AnimatedEntry({
  children,
  delay = 0,
  duration = 450,
  slideDistance = 16,
  className,
}: AnimatedEntryProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slideDistance);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className={className}>
      {children}
    </Animated.View>
  );
}

/**
 * Scale-in animation for interactive elements like FABs and buttons.
 */
export function AnimatedScale({
  children,
  delay = 0,
  duration = 350,
  className,
}: Omit<AnimatedEntryProps, "slideDistance">) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
    scale.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.back(1.5)) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className={className}>
      {children}
    </Animated.View>
  );
}
