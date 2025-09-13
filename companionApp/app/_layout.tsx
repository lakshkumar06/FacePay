import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { WalletProvider } from '@/contexts/WalletContext';

// Set up crypto for TweetNaCl
import nacl from 'tweetnacl';

// Initialize crypto - react-native-get-random-values sets up global.crypto.getRandomValues
nacl.setPRNG((size: number) => {
  const array = new Uint8Array(size);
  if (global.crypto && global.crypto.getRandomValues) {
    global.crypto.getRandomValues(array);
  } else {
    // Fallback for development
    for (let i = 0; i < size; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <WalletProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="onConnect" options={{ headerShown: false }} />
          <Stack.Screen name="onDisconnect" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </WalletProvider>
  );
}
