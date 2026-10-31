import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows, borderRadius } from '@/theme';

interface Clay3DCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'light' | 'medium' | 'gradient';
  onPress?: () => void;
  shadowSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Clay3DCard: React.FC<Clay3DCardProps> = ({
  children,
  style,
  variant = 'light',
  onPress,
  shadowSize = 'md',
}) => {
  const CardWrapper = onPress ? Pressable : View;

  const getBackground = (): string | undefined => {
    switch (variant) {
      case 'light':
        return colors.clay.light;
      case 'medium':
        return colors.clay.medium;
      case 'gradient':
        return undefined;
      default:
        return colors.clay.light;
    }
  };

  const content = (
    <View style={[styles.container, shadows.clay[shadowSize], style]}>
      {variant === 'gradient' ? (
        <LinearGradient
          colors={colors.liquid.aurora}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          {children}
        </LinearGradient>
      ) : (
        <View style={[styles.card, { backgroundColor: getBackground() }]}>
          {children}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <CardWrapper onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        {content}
      </CardWrapper>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  card: {
    padding: 20,
    borderRadius: borderRadius.lg,
  },
  gradientCard: {
    padding: 20,
    borderRadius: borderRadius.lg,
  },
});
