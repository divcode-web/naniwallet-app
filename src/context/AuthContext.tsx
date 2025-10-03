import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackendOTPService from '../services/backendOTPService';
import KYCService from '../services/kycService';
import { navigate } from '../navigation/navigationRef';

interface User {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified: boolean;
  walletAddress?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsWalletSetup: boolean;
  kycStatus: 'notstarted' | 'pending' | 'approved' | 'rejected' | null;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (fullName?: string, photoURL?: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  verifyOTPAndCreateAccount: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  sendPhoneOTP: (phoneNumber: string) => Promise<void>;
  verifyPhoneOTP: (phoneNumber: string, otp: string) => Promise<void>;
  verifyPhoneOTPAndCreateAccount: (email: string, password: string, fullName: string, phoneNumber: string, otp: string) => Promise<void>;
  completeWalletSetup: () => void;
  completeKYCAndLogin: () => Promise<void>;
  checkKYCStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsWalletSetup, setNeedsWalletSetup] = useState(false);
  const [kycStatus, setKycStatus] = useState<'notstarted' | 'pending' | 'approved' | 'rejected' | null>(null);

  useEffect(() => {
    // Check for existing authentication token on app start
    checkAuthToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuthToken = async () => {
    console.log('🔍 AuthContext: Checking auth token...');
    try {
      setLoading(true);
      
      // Check for stored token
      const token = await AsyncStorage.getItem('authToken');
      
      if (token) {
        // User has logged in before
        const userStr = await AsyncStorage.getItem('userData');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
          
          // Check if they have wallets (SKIP KYC check)
          const walletsStr = await AsyncStorage.getItem('wallets');
          const hasWallets = walletsStr && JSON.parse(walletsStr).length > 0;
          
          setNeedsWalletSetup(!hasWallets);
          console.log('✅ AuthContext: User authenticated, hasWallets:', hasWallets);
        } else {
          // Token but no user data, clear token
          await AsyncStorage.removeItem('authToken');
          setUser(null);
          setNeedsWalletSetup(false);
          console.log('⚠️ AuthContext: Invalid token, cleared');
        }
      } else {
        // No token, user needs to sign in
        setUser(null);
        setNeedsWalletSetup(false);
        console.log('⚠️ AuthContext: No auth token found');
      }
    } catch (error) {
      console.error('❌ Error checking auth token:', error);
      setUser(null);
      setNeedsWalletSetup(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyTokenWithBackend = async (token: string): Promise<boolean> => {
    try {
      const backendOTPService = BackendOTPService.getInstance();
      const response = await fetch(`${backendOTPService.getConfig().baseUrl}/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update user data with fresh data from backend
          setUser(result.user);
          await AsyncStorage.setItem('userData', JSON.stringify(result.user));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  };

  const clearAuthData = async () => {
    // Clear all authentication and wallet data when user signs out
    await AsyncStorage.multiRemove(['authToken', 'userData', 'walletSetupCompleted', 'walletInfo', 'tempSignupData', 'emailVerifiedData', 'kycData', 'pendingAccountData']);
    setUser(null);
    setNeedsWalletSetup(false);
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<void> => {
    try {
      console.log('📧 Starting signup process for:', email);
      
      // Send OTP for email verification
      const backendOTPService = BackendOTPService.getInstance();
      const result = await backendOTPService.sendOTP(email);
      
      if (!result.success) {
        console.log('❌ OTP send failed:', result.message);
        throw new Error(result.message);
      }
      
      console.log('✅ OTP sent successfully');
      
      // Store signup data temporarily for OTP verification
      const tempData = {
        email,
        password,
        fullName
      };
      
      await AsyncStorage.setItem('tempSignupData', JSON.stringify(tempData));
      console.log('💾 Temporary signup data stored:', tempData);
      
      // Verify the data was stored correctly
      const storedData = await AsyncStorage.getItem('tempSignupData');
      console.log('✅ Verification - stored data:', storedData);
      console.log('✅ Verification - data matches:', storedData === JSON.stringify(tempData));
    } catch (error: any) {
      console.log('❌ Signup error:', error.message);
      throw new Error(error.message);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const backendOTPService = BackendOTPService.getInstance();
      console.log('🔐 Attempting sign in for:', email);
      console.log('🌐 Backend URL:', `${backendOTPService.getConfig().baseUrl}/auth/login`);
      
      const response = await fetch(`${backendOTPService.getConfig().baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Get response text first to debug
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);
      
      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.log('❌ JSON parse error:', parseError);
        console.log('❌ Response that failed to parse:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      console.log('✅ Parsed response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      // Store auth data
      await AsyncStorage.setItem('authToken', result.token);
      await AsyncStorage.setItem('userData', JSON.stringify(result.user));
      
      setUser(result.user);
      console.log('✅ Sign in successful for user:', result.user);
      
      // SKIP KYC - Just check if user has wallets
      const walletsStr = await AsyncStorage.getItem('wallets');
      const hasWallets = walletsStr && JSON.parse(walletsStr).length > 0;
      
      setNeedsWalletSetup(!hasWallets);
      console.log('✅ Sign in successful, hasWallets:', hasWallets);
    } catch (error: any) {
      console.log('❌ Sign in error:', error);
      throw new Error(error.message);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 User signing out - clearing all data');
      await clearAuthData();
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw new Error(error.message);
    }
  };

  const resetPassword = async (_email: string): Promise<void> => {
    try {
      // TODO: Implement password reset through backend
      throw new Error('Password reset not implemented yet');
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const updateProfile = async (fullName?: string, photoURL?: string): Promise<void> => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const backendOTPService = BackendOTPService.getInstance();
      const response = await fetch(`${backendOTPService.getConfig().baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName,
          photoURL
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Profile update failed');
      }

      // Update local user data
      setUser(result.user);
      await AsyncStorage.setItem('userData', JSON.stringify(result.user));
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<void> => {
    try {
      const backendOTPService = BackendOTPService.getInstance();
      const result = await backendOTPService.verifyOTP(email, otp);
      
      if (!result.success) {
        throw new Error(result.message);
      }

      // Just verify OTP, don't create account or log in
      // This is used for password reset or other OTP verifications
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const verifyOTPAndCreateAccount = async (email: string, otp: string): Promise<void> => {
    try {
      console.log('🔍 Starting OTP verification and account creation for:', email);
      
      // Debug: Check all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🔑 All AsyncStorage keys:', allKeys);
      
      // Debug: Check if tempSignupData exists
      const tempData = await AsyncStorage.getItem('tempSignupData');
      console.log('📦 Temp signup data found:', tempData ? 'YES' : 'NO');
      console.log('📦 Temp signup data content:', tempData);
      
      const backendOTPService = BackendOTPService.getInstance();
      const result = await backendOTPService.verifyOTP(email, otp);
      
      if (!result.success) {
        console.log('❌ OTP verification failed:', result.message);
        throw new Error(result.message);
      }

      console.log('✅ OTP verified successfully');

      // Get temporary signup data again after OTP verification
      const tempDataAfterOTP = await AsyncStorage.getItem('tempSignupData');
      console.log('📦 Temp signup data after OTP verification:', tempDataAfterOTP ? 'YES' : 'NO');
      console.log('📦 Temp signup data content after OTP:', tempDataAfterOTP);
      
      if (tempDataAfterOTP) {
        const { email: signupEmail, password, fullName } = JSON.parse(tempDataAfterOTP);
        console.log('📱 Email OTP verified, preparing for phone verification for:', signupEmail);
        
        // Store verified email data for phone verification
        await AsyncStorage.setItem('emailVerifiedData', JSON.stringify({
          email: signupEmail,
          password,
          fullName,
          emailOtpVerified: true
        }));
        
        console.log('✅ Email verification complete, ready for phone OTP');
      } else {
        console.log('❌ No temporary signup data found after OTP verification');
        console.log('🔍 Available AsyncStorage keys:', await AsyncStorage.getAllKeys());
        throw new Error('No signup data found. Please try signing up again.');
      }
    } catch (error: any) {
      console.log('❌ Error in verifyOTPAndCreateAccount:', error.message);
      throw new Error(error.message);
    }
  };

  const resendOTP = async (email: string): Promise<void> => {
    try {
      const backendOTPService = BackendOTPService.getInstance();
      const result = await backendOTPService.resendOTP(email);
      
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const sendPhoneOTP = async (phoneNumber: string): Promise<void> => {
    try {
      console.log('📱 Sending phone OTP to:', phoneNumber);
      
      const backendOTPService = BackendOTPService.getInstance();
      const url = `${backendOTPService.getConfig().baseUrl}/otp/send-phone`;
      console.log('🌐 Phone OTP URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber })
      });

      console.log('📡 Phone OTP response status:', response.status);
      console.log('📡 Phone OTP response headers:', response.headers);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Phone OTP error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Get response text first to debug
      const responseText = await response.text();
      console.log('📄 Phone OTP raw response text:', responseText);
      
      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.log('❌ Phone OTP JSON parse error:', parseError);
        console.log('❌ Phone OTP response that failed to parse:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      console.log('✅ Phone OTP parsed response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send phone OTP');
      }
    } catch (error: any) {
      console.log('❌ Phone OTP send error:', error);
      throw new Error(error.message);
    }
  };

  const verifyPhoneOTP = async (phoneNumber: string, otp: string): Promise<void> => {
    try {
      console.log('🔐 Verifying phone OTP for:', phoneNumber);
      
      const backendOTPService = BackendOTPService.getInstance();
      const url = `${backendOTPService.getConfig().baseUrl}/otp/verify-phone`;
      console.log('🌐 Phone OTP verification URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber, otp })
      });

      console.log('📡 Phone OTP verification response status:', response.status);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Phone OTP verification error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Get response text first to debug
      const responseText = await response.text();
      console.log('📄 Phone OTP verification raw response text:', responseText);
      
      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.log('❌ Phone OTP verification JSON parse error:', parseError);
        console.log('❌ Phone OTP verification response that failed to parse:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      console.log('✅ Phone OTP verification parsed response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Phone OTP verification failed');
      }
    } catch (error: any) {
      console.log('❌ Phone OTP verification error:', error);
      throw new Error(error.message);
    }
  };

  const verifyPhoneOTPAndCreateAccount = async (
    email: string, 
    password: string, 
    fullName: string, 
    phoneNumber: string, 
    otp: string
  ): Promise<void> => {
    try {
      console.log('🔐 Verifying phone OTP and creating account for:', email);
      
      // First verify the phone OTP
      await verifyPhoneOTP(phoneNumber, otp);
      
      // Get email verified data
      const emailVerifiedData = await AsyncStorage.getItem('emailVerifiedData');
      if (!emailVerifiedData) {
        throw new Error('Email verification data not found. Please start over.');
      }
      
      const { email: verifiedEmail, password: verifiedPassword, fullName: verifiedFullName } = JSON.parse(emailVerifiedData);
      
      // Create user account with phone number but don't auto-login
      const registrationResult = await createUserAccountWithoutLogin(verifiedEmail, verifiedPassword, verifiedFullName, phoneNumber);
      
      // Store account data and credentials for post-KYC login
      await AsyncStorage.setItem('pendingAccountData', JSON.stringify({
        email: verifiedEmail,
        fullName: verifiedFullName,
        phoneNumber: phoneNumber,
        token: registrationResult.token,
        user: registrationResult.user
      }));
      
      // Clean up all temporary data
      await AsyncStorage.removeItem('tempSignupData');
      await AsyncStorage.removeItem('emailVerifiedData');
      
      console.log('✅ Account created successfully with phone verification - ready for KYC');
    } catch (error: any) {
      console.log('❌ Phone OTP verification and account creation error:', error);
      throw new Error(error.message);
    }
  };

  const createUserAccountWithoutLogin = async (email: string, password: string, fullName: string, phoneNumber?: string) => {
    try {
      console.log('🌐 Calling registration API for:', email, '(without auto-login)');
      
      const backendOTPService = BackendOTPService.getInstance();
      const url = `${backendOTPService.getConfig().baseUrl}/auth/register`;
      console.log('📡 Registration URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phoneNumber
        })
      });

      console.log('📊 Registration response status:', response.status);
      
      const result = await response.json();
      console.log('📋 Registration response:', result);

      if (!result.success) {
        console.log('❌ Registration failed:', result.error);
        throw new Error(result.error || 'Registration failed');
      }

      console.log('✅ Registration successful - account created without login');
      
      return {
        token: result.token,
        user: result.user
      };
    } catch (error: any) {
      console.log('❌ Registration error:', error.message);
      throw new Error(error.message);
    }
  };

  const createUserAccount = async (email: string, password: string, fullName: string, phoneNumber?: string) => {
    try {
      console.log('🌐 Calling registration API for:', email);
      
      const backendOTPService = BackendOTPService.getInstance();
      const url = `${backendOTPService.getConfig().baseUrl}/auth/register`;
      console.log('📡 Registration URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phoneNumber
        })
      });

      console.log('📊 Registration response status:', response.status);
      
      const result = await response.json();
      console.log('📋 Registration response:', result);

      if (!result.success) {
        console.log('❌ Registration failed:', result.error);
        throw new Error(result.error || 'Registration failed');
      }

      console.log('✅ Registration successful');
      
      // Automatically log in the user after successful registration
      if (result.token && result.user) {
        await AsyncStorage.setItem('authToken', result.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        // Don't set walletSetupCompleted yet - user needs to complete wallet setup
        setUser(result.user);
        setNeedsWalletSetup(true); // User needs to complete wallet setup
        console.log('🔐 User automatically logged in after registration');
      }
      
      return {
        token: result.token,
        user: result.user
      };
    } catch (error: any) {
      console.log('❌ Registration error:', error.message);
      throw new Error(error.message || 'Failed to create user account');
    }
  };

  const completeWalletSetup = async () => {
    console.log('🔄 completeWalletSetup called - current needsWalletSetup:', needsWalletSetup);
    setNeedsWalletSetup(false);
    // Set a simple user for the app to function
    setUser({
      id: 'local-user',
      uid: 'local-user',
      email: 'wallet@local.app',
      fullName: 'Wallet User',
      emailVerified: true,
    });
    console.log('✅ Wallet setup completed - needsWalletSetup set to false');
    
    // Navigate to Home
    setTimeout(() => {
      try {
        navigate('Home');
      } catch (_e) {}
    }, 100);
  };

  const checkKYCStatus = async () => {
    try {
      if (!user) {
        setKycStatus(null);
        return;
      }

      console.log('🔍 Checking KYC status for user:', user.email);
      const kycService = KYCService.getInstance();
      const result = await kycService.getKYCStatus();
      
      if (result.success) {
        console.log('✅ KYC Status:', result.kycStatus);
        setKycStatus(result.kycStatus);
      } else {
        console.log('❌ Failed to get KYC status, defaulting to notstarted');
        setKycStatus('notstarted');
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
      setKycStatus('notstarted');
    }
  };

  const completeKYCAndLogin = async () => {
    try {
      console.log('🔐 Completing KYC and going directly to home...');
      
      // Get pending account data
      const pendingAccountData = await AsyncStorage.getItem('pendingAccountData');
      if (!pendingAccountData) {
        throw new Error('No pending account data found');
      }
      
      const accountData = JSON.parse(pendingAccountData);
      console.log('📋 Found pending account data:', accountData);
      
      // Log in the user with stored token and user data
      await AsyncStorage.setItem('authToken', accountData.token);
      await AsyncStorage.setItem('userData', JSON.stringify(accountData.user));
      
      // Set user state but skip wallet setup since we're going directly to home
      setUser(accountData.user);
      setNeedsWalletSetup(false); // Skip wallet setup, go directly to home
      await AsyncStorage.setItem('walletSetupCompleted', 'true');
      
      // Update KYC status to pending (since KYC was just submitted)
      setKycStatus('pending');
      
      // Clean up pending data
      await AsyncStorage.removeItem('pendingAccountData');
      
      console.log('✅ User logged in successfully after KYC completion, going to home');
    } catch (error: any) {
      console.error('❌ Error completing KYC and login:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    needsWalletSetup,
    kycStatus,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    verifyOTP,
    verifyOTPAndCreateAccount,
    resendOTP,
    sendPhoneOTP,
    verifyPhoneOTP,
    verifyPhoneOTPAndCreateAccount,
    completeWalletSetup,
    completeKYCAndLogin,
    checkKYCStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
