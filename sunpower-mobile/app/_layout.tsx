import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SMSAuthService } from '@/services/smsAuth';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(portal)" />
      <Stack.Screen name="documents" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="assets" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="subsidy" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="calculator" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
