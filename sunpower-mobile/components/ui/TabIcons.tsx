import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface TabIconProps {
  focused: boolean;
  color: string;
}

export function HomeTabIcon({ focused }: TabIconProps) {
  if (focused) {
    return (
      <View style={styles.activePill}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
            fill="#FFFFFF"
          />
          <Path
            d="M9 21V13H15V21"
            stroke="#10B981"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }
  return (
    <View style={styles.inactiveIcon}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
          stroke="#94A3B8"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export function ServicesTabIcon({ focused }: TabIconProps) {
  const stroke = focused ? '#10B981' : '#94A3B8';
  return (
    <View style={styles.inactiveIcon}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Rect
          x={3}
          y={4}
          width={18}
          height={16}
          rx={3}
          stroke={stroke}
          strokeWidth={2}
        />
        <Path
          d="M8 9H16M8 14H13"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function AITabIcon({ focused }: TabIconProps) {
  const stroke = focused ? '#10B981' : '#94A3B8';
  return (
    <View style={styles.inactiveIcon}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Rect
          x={4}
          y={7}
          width={16}
          height={13}
          rx={5}
          stroke={stroke}
          strokeWidth={2}
        />
        <Circle cx={9} cy={13} r={1.5} fill={stroke} />
        <Circle cx={15} cy={13} r={1.5} fill={stroke} />
        <Path
          d="M12 3V7M2 13H4M20 13H22M9 16.5C10 17.5 14 17.5 15 16.5"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function TrackTabIcon({ focused }: TabIconProps) {
  const stroke = focused ? '#10B981' : '#94A3B8';
  return (
    <View style={styles.inactiveIcon}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={9} r={3} stroke={stroke} strokeWidth={2} />
      </Svg>
    </View>
  );
}

export function ProfileTabIcon({ focused }: TabIconProps) {
  const stroke = focused ? '#10B981' : '#94A3B8';
  return (
    <View style={styles.inactiveIcon}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={4} stroke={stroke} strokeWidth={2} />
        <Path
          d="M5 20C5 16.6863 8.13401 14 12 14C15.866 14 19 16.6863 19 20"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  activePill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  inactiveIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
