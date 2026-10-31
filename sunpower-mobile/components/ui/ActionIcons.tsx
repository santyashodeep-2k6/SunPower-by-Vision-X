import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

export function CalculatorIcon() {
  return (
    <Image
      source={require('@/assets/icon_calc.jpg')}
      style={styles.imageIcon}
      resizeMode="contain"
    />
  );
}

export function QuotationIcon() {
  return (
    <Image
      source={require('@/assets/icon_quote.jpg')}
      style={styles.imageIcon}
      resizeMode="contain"
    />
  );
}

export function RobotHeadIcon() {
  return (
    <View style={styles.robotContainer}>
      <Svg width={44} height={44} viewBox="0 0 44 44" fill="none">
        <Defs>
          <SvgGradient id="robotGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#E2E8F0" />
          </SvgGradient>
          <SvgGradient id="visorGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#064E3B" />
            <Stop offset="100%" stopColor="#022C22" />
          </SvgGradient>
          <SvgGradient id="earGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#C4B5FD" />
            <Stop offset="100%" stopColor="#8B5CF6" />
          </SvgGradient>
        </Defs>

        {/* Antenna */}
        <Rect x={20} y={4} width={4} height={6} rx={2} fill="#C4B5FD" />
        <Circle cx={22} cy={4} r={3} fill="#8B5CF6" />

        {/* Ears / Headphone puffs */}
        <Rect x={3} y={15} width={6} height={12} rx={3} fill="url(#earGrad)" />
        <Rect x={35} y={15} width={6} height={12} rx={3} fill="url(#earGrad)" />

        {/* Head Clay Capsule */}
        <Rect x={7} y={10} width={30} height={22} rx={9} fill="url(#robotGrad)" />

        {/* Visor Screen */}
        <Rect x={11} y={14} width={22} height={13} rx={5} fill="url(#visorGrad)" />

        {/* Glowing Green Smiling Eyes */}
        <Path
          d="M14.5 19.5C15 17.5 17 17.5 17.5 19.5"
          stroke="#10B981"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <Path
          d="M26.5 19.5C27 17.5 29 17.5 29.5 19.5"
          stroke="#10B981"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        {/* Smile */}
        <Path
          d="M20 23.5C21 24.5 23 24.5 24 23.5"
          stroke="#10B981"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function LocationPinIcon() {
  return (
    <View style={styles.pinContainer}>
      <Svg width={44} height={44} viewBox="0 0 44 44" fill="none">
        <Defs>
          <SvgGradient id="pinGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#8B5CF6" />
            <Stop offset="100%" stopColor="#6D28D9" />
          </SvgGradient>
          <SvgGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#EDE9FE" />
            <Stop offset="100%" stopColor="#DDD6FE" />
          </SvgGradient>
        </Defs>

        {/* Rounded clay squircle badge */}
        <Rect x={2} y={2} width={40} height={40} rx={12} fill="url(#bgGrad)" />

        {/* 3D Purple Pin */}
        <Path
          d="M22 32C22 32 29 24.5 29 19C29 15.134 25.866 12 22 12C18.134 12 15 15.134 15 19C15 24.5 22 32 22 32Z"
          fill="url(#pinGrad)"
        />
        {/* Inner white circle */}
        <Circle cx={22} cy={18.5} r={3.2} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  imageIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  robotContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
