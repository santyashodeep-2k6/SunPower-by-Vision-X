import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows, borderRadius, typography } from '@/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      ...shadows.clay.md,
      borderRadius: borderRadius.round,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    };

    switch (size) {
      case 'sm':
        return { ...base, paddingVertical: 10, paddingHorizontal: 16 };
      case 'md':
        return { ...base, paddingVertical: 14, paddingHorizontal: 24 };
      case 'lg':
        return { ...base, paddingVertical: 18, paddingHorizontal: 32 };
    }
  };

  const getTextStyle = (): TextStyle => {
    const base = {
      fontWeight: '600' as const,
    };

    switch (size) {
      case 'sm':
        return { ...base, fontSize: 14 };
      case 'md':
        return { ...base, fontSize: 16 };
      case 'lg':
        return { ...base, fontSize: 18 };
    }
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary.violet : colors.white} />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), variant === 'outline' ? styles.outlineText : styles.primaryText]}>
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [getButtonStyle(), style, { opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={colors.liquid.aurora}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {renderContent()}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        getButtonStyle(),
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        style,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {renderContent()}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary.violet,
  },
  secondary: {
    backgroundColor: colors.eco.leaf,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary.violet,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.round,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.primary.violet,
  },
});
