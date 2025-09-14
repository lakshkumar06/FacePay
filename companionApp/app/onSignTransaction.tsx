import { Redirect } from 'expo-router';

export default function OnSignTransaction() {
  // This route handles the onSignTransaction deeplink
  // The actual handling is done in WalletContext
  return <Redirect href="/(tabs)" />;
}
