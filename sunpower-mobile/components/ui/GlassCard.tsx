import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, shadows } from '@/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 20,
  tint = 'light',
}) => {
  return (
    <View style={[styles.container, shadows.glass, style]}>
      <BlurView intensity={intensity} tint={tint} style={styles.blur}>
        <View style={styles.content}>{children}</View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.glass.light,
    borderWidth: 1,
    borderColor: colors.glass.medium,
  },
  blur: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});
