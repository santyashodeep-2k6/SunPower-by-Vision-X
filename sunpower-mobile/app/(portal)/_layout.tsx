import React from 'react';
import { Tabs } from 'expo-router';
import {
  HomeTabIcon,
  ServicesTabIcon,
  AITabIcon,
  TrackTabIcon,
  ProfileTabIcon,
} from '@/components/ui/TabIcons';

export default function PortalLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          position: 'absolute',
          bottom: 12,
          left: 16,
          right: 16,
          height: 68,
          borderRadius: 36,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          shadowColor: '#000000',
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <HomeTabIcon focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="service"
        options={{
          title: 'Services',
          tabBarIcon: ({ focused, color }) => (
            <ServicesTabIcon focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ focused, color }) => (
            <AITabIcon focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="installations"
        options={{
          title: 'Track',
          tabBarIcon: ({ focused, color }) => (
            <TrackTabIcon focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <ProfileTabIcon focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
