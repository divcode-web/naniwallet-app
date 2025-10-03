import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Auth Screens
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { EmailOTPVerificationScreen } from '../screens/auth/EmailOTPVerificationScreen';
import { PhoneOTPVerificationScreen } from '../screens/auth/PhoneOTPVerificationScreen';

// KYC Screens
import { KYCWelcomeScreen } from '../screens/kyc/KYCWelcomeScreen';
import { KYCPersonalInfoScreen } from '../screens/kyc/KYCPersonalInfoScreen';
import { KYCDocumentUploadScreen } from '../screens/kyc/KYCDocumentUploadScreen';
import { KYCReviewScreen } from '../screens/kyc/KYCReviewScreen';
import { KYCCameraScreen } from '../screens/kyc/KYCCameraScreen';

// Main Screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { PreferencesScreen } from '../screens/main/PreferencesScreen';
import { SecurityScreen } from '../screens/main/SecurityScreen';
import { PaymentMethodsScreen } from '../screens/main/PaymentMethodsScreen';
import { NotificationSettingsScreen } from '../screens/main/NotificationsScreen';
import { NotificationScreen } from '../screens/main/NotificationScreen';
import { AccountProfileScreen } from '../screens/main/AccountProfileScreen';
import { LanguageScreen } from '../screens/main/LanguageScreen';

// Wallet Screens
import { WalletSetupScreen } from '../screens/wallet/WalletSetupScreen';
import { WalletDashboardScreen } from '../screens/wallet/WalletDashboardScreen';
import { SelectTokenScreen } from '../screens/wallet/SelectTokenScreen';
import { WalletSelectScreen } from '../screens/wallet/WalletSelectScreen';
import { ManageWalletScreen } from '../screens/wallet/ManageWalletScreen';
import { EditWalletScreen } from '../screens/wallet/EditWalletScreen';

// Transaction Screens
import { TopUpScreen } from '../screens/transaction/TopUpScreen';
import { SelectReceiveTokenScreen } from '../screens/transaction/SelectReceiveTokenScreen';
import ReceiveScreen from '../screens/transaction/ReceiveScreen';
import { SelectSendTokenScreen } from '../screens/transaction/SelectSendTokenScreen';
import { SendScreen } from '../screens/transaction/SendScreen';

// Loading Screen Component
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createStackNavigator();

const LoadingScreen: React.FC = () => {
  const { theme } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
};

const AuthStack: React.FC = () => {
  const { theme } = useTheme();
  const { user, needsWalletSetup } = useAuth();

  // Determine initial route
  let initialRoute = "SignIn";
  
  if (user && needsWalletSetup) {
    // User logged in but needs wallet
    initialRoute = "WalletSetup";
  }
  
  console.log('🔧 AuthStack - initialRoute:', initialRoute);

  return (
    // @ts-ignore - Navigation type mismatch in @react-navigation/stack v7, runtime works fine
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="EmailOTPVerification" component={EmailOTPVerificationScreen as any} />
      <Stack.Screen name="PhoneOTPVerification" component={PhoneOTPVerificationScreen as any} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="WalletSetup" component={WalletSetupScreen} />
      <Stack.Screen name="WalletSelect" component={WalletSelectScreen} />
      <Stack.Screen name="ManageWallet" component={ManageWalletScreen} />
      <Stack.Screen name="EditWallet" component={EditWalletScreen} />
      <Stack.Screen name="SelectSendToken" component={SelectSendTokenScreen} />
      <Stack.Screen name="SendDialog" component={SendScreen} />
      <Stack.Screen name="TopUp" component={TopUpScreen} />
      <Stack.Screen name="SelectReceiveToken" component={SelectReceiveTokenScreen} />
      <Stack.Screen name="ReceiveDialog" component={ReceiveScreen} />
    </Stack.Navigator>
  );
};

const MainStack: React.FC = () => {
  const { theme } = useTheme();

  console.log('🏠 MainStack - rendering with Home as initial route');

  return (
    // @ts-ignore - Navigation type mismatch in @react-navigation/stack v7, runtime works fine
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="Notification" component={NotificationScreen} />
      <Stack.Screen name="AccountProfile" component={AccountProfileScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="SelectToken" component={SelectTokenScreen} />
      <Stack.Screen name="WalletSelect" component={WalletSelectScreen} />
      <Stack.Screen name="ManageWallet" component={ManageWalletScreen} />
      <Stack.Screen name="EditWallet" component={EditWalletScreen} />
      <Stack.Screen name="WalletSetup" component={WalletSetupScreen} />
      <Stack.Screen name="WalletDashboard" component={WalletDashboardScreen} />
      <Stack.Screen name="SelectSendToken" component={SelectSendTokenScreen} />
      <Stack.Screen name="SendDialog" component={SendScreen} />
      <Stack.Screen name="TopUp" component={TopUpScreen} options={{ title: 'Top Up' }} />
      <Stack.Screen name="SelectReceiveToken" component={SelectReceiveTokenScreen} />
      <Stack.Screen name="ReceiveDialog" component={ReceiveScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user, loading, needsWalletSetup } = useAuth();
  const { theme } = useTheme();

  // Debug logging
  console.log('🧭 AppNavigator - User:', user ? 'Logged in' : 'Not logged in');
  console.log('🧭 AppNavigator - needsWalletSetup:', needsWalletSetup);
  console.log('🧭 AppNavigator - Should show MainStack:', user && !needsWalletSetup);
  console.log('🧭 AppNavigator - Navigation decision:', user && !needsWalletSetup ? 'MainStack (Home)' : 'AuthStack (Wallet Setup)');

  // Log when state changes
  useEffect(() => {
    console.log('🔄 AppNavigator state changed - User:', user ? 'Logged in' : 'Not logged in', 'needsWalletSetup:', needsWalletSetup);
    console.log('🔄 AppNavigator will render:', user && !needsWalletSetup ? 'MainStack' : 'AuthStack');
  }, [user, needsWalletSetup]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      key={`nav-${user ? 'logged-in' : 'not-logged-in'}-${needsWalletSetup ? 'wallet-needed' : 'wallet-complete'}`}
      theme={{
        dark: theme.isDark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.error,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: 'normal',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: 'bold',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
    >
      {user && !needsWalletSetup ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
