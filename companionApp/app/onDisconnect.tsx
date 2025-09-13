import { Redirect } from 'expo-router';

export default function OnDisconnect() {
  // This route handles the onDisconnect deeplink
  // The actual handling is done in WalletContext
  return <Redirect href="/(tabs)" />;
}
