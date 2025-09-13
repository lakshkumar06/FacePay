import { Redirect } from 'expo-router';

export default function OnConnect() {
  // This route handles the onConnect deeplink
  // The actual handling is done in WalletContext
  return <Redirect href="/(tabs)" />;
}
