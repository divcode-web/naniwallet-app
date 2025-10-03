import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Clipboard,
  Alert,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useWeb3Auth } from '../../context/Web3AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TokenAddressService from '../../services/tokenAddressService';
import PaymentMethodService, { PaymentMethod } from '../../services/paymentMethodService';

interface TopUpScreenProps {
  navigation: any;
  route: any;
}

interface FaucetInfo {
  name: string;
  url: string;
  description: string;
  network: string;
  icon: string;
}

export const TopUpScreen: React.FC<TopUpScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { wallet } = useWeb3Auth();
  const [selectedAddress, setSelectedAddress] = useState('');
  const [addressType, setAddressType] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethodSheetVisible, setPaymentMethodSheetVisible] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  const token = route.params?.token;

  useEffect(() => {
    loadAddress();
    loadPaymentMethods();
  }, [token, wallet]);

  const loadAddress = async () => {
    if (!wallet || !token) return;

    try {
      const symbol = token.symbol.toUpperCase();

      if (symbol === 'ETH') {
        setSelectedAddress(wallet.address);
        setAddressType('Ethereum Sepolia');
      } else if (symbol === 'BTC' || symbol === 'SOL') {
        const addressService = TokenAddressService.getInstance();
        const addressInfo = await addressService.getTokenAddressInfo(token, wallet.mnemonic);
        setSelectedAddress(addressInfo?.address || '');
        setAddressType(symbol === 'BTC' ? 'Bitcoin Testnet' : 'Solana Devnet');
      }
    } catch (error) {
      console.error('Failed to load address:', error);
    }
  };

  const loadPaymentMethods = async () => {
    if (!wallet) return;

    try {
      setLoadingPaymentMethods(true);
      const paymentMethodService = PaymentMethodService.getInstance();
      const methods = await paymentMethodService.getPaymentMethods(wallet.address);
      setPaymentMethods(methods.filter(method => method.isActive && method.isVerified));
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const getFaucets = (): FaucetInfo[] => {
    const symbol = token?.symbol?.toUpperCase();

    if (symbol === 'ETH') {
      return [
        {
          name: 'Sepolia PoW Faucet',
          url: 'https://sepolia-faucet.pk910.de/',
          description: 'Mine testnet ETH using Proof of Work',
          network: 'Sepolia Testnet',
          icon: '⛏️',
        },
        {
          name: 'Alchemy Sepolia Faucet',
          url: 'https://sepoliafaucet.com/',
          description: 'Get 0.5 Sepolia ETH per day',
          network: 'Sepolia Testnet',
          icon: '🌊',
        },
        {
          name: 'Infura Sepolia Faucet',
          url: 'https://www.infura.io/faucet/sepolia',
          description: 'Requires Infura account',
          network: 'Sepolia Testnet',
          icon: '💧',
        },
      ];
    } else if (symbol === 'BTC') {
      return [
        {
          name: 'Bitcoin Testnet Faucet',
          url: 'https://testnet-faucet.com/btc-testnet/',
          description: 'Get free Bitcoin testnet coins',
          network: 'Bitcoin Testnet',
          icon: '₿',
        },
        {
          name: 'Coinfaucet.eu',
          url: 'https://coinfaucet.eu/en/btc-testnet/',
          description: 'Bitcoin testnet faucet',
          network: 'Bitcoin Testnet',
          icon: '🪙',
        },
        {
          name: 'BitcoinTestnet.run',
          url: 'https://bitcointestnet.run/',
          description: 'Simple testnet BTC faucet',
          network: 'Bitcoin Testnet',
          icon: '🔗',
        },
      ];
    } else if (symbol === 'SOL') {
      return [
        {
          name: 'Solana Devnet Faucet',
          url: 'https://faucet.solana.com/',
          description: 'Official Solana devnet faucet - up to 5 SOL',
          network: 'Solana Devnet',
          icon: '◎',
        },
        {
          name: 'SolFaucet',
          url: 'https://solfaucet.com/',
          description: 'Community devnet faucet',
          network: 'Solana Devnet',
          icon: '💎',
        },
      ];
    }

    return [];
  };

  const handleCopyAddress = () => {
    Clipboard.setString(selectedAddress);
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  const handleOpenFaucet = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open faucet link');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    infoCard: {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      opacity: 0.8,
    },
    addressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
    },
    addressLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    addressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    addressText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'monospace',
      marginRight: 12,
    },
    copyButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      padding: 8,
    },
    networkText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    paymentMethodCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
    },
    paymentMethodSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
    },
    paymentMethodInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    paymentMethodText: {
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 12,
      fontWeight: '500',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    faucetCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    faucetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    faucetIcon: {
      fontSize: 32,
      marginRight: 12,
    },
    faucetInfo: {
      flex: 1,
    },
    faucetName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    faucetNetwork: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    faucetDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    openButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    openButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      paddingBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    closeBtn: { padding: 8 },
    paymentMethodItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    paymentMethodItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    paymentMethodDetails: {
      marginLeft: 12,
      flex: 1,
    },
    paymentMethodName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    paymentMethodDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    addPaymentButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginTop: 16,
    },
    addPaymentButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const faucets = getFaucets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Up {token?.symbol || ''}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Testnet Tokens</Text>
          <Text style={styles.infoText}>
            Testnet tokens have no real value and are used for testing purposes only. Use the faucets below to get free testnet tokens.
          </Text>
        </View>

        {selectedAddress ? (
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>Your {addressType} Address</Text>
            <View style={styles.addressContainer}>
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                {selectedAddress}
              </Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyAddress}>
                <Icon name="content-copy" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.networkText}>Network: {addressType}</Text>
          </View>
        ) : null}

        {/* Payment Method Selection */}
        <View style={styles.paymentMethodCard}>
          <Text style={styles.addressLabel}>Payment Method</Text>
          <TouchableOpacity
            style={styles.paymentMethodSelector}
            onPress={() => setPaymentMethodSheetVisible(true)}
          >
            <View style={styles.paymentMethodInfo}>
              {selectedPaymentMethod ? (
                <>
                  <Icon name={PaymentMethodService.getInstance().getPaymentMethodIcon(selectedPaymentMethod)} size={20} color={theme.colors.primary} />
                  <Text style={styles.paymentMethodText}>
                    {PaymentMethodService.getInstance().formatPaymentMethod(selectedPaymentMethod)}
                  </Text>
                </>
              ) : (
                <>
                  <Icon name="payment" size={20} color={theme.colors.textSecondary} />
                  <Text style={[styles.paymentMethodText, { color: theme.colors.textSecondary }]}>
                    Select Payment Method
                  </Text>
                </>
              )}
            </View>
            <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Available Faucets</Text>

        {faucets.length > 0 ? (
          faucets.map((faucet, index) => (
            <View key={index} style={styles.faucetCard}>
              <View style={styles.faucetHeader}>
                <Text style={styles.faucetIcon}>{faucet.icon}</Text>
                <View style={styles.faucetInfo}>
                  <Text style={styles.faucetName}>{faucet.name}</Text>
                  <Text style={styles.faucetNetwork}>{faucet.network}</Text>
                </View>
              </View>
              <Text style={styles.faucetDescription}>{faucet.description}</Text>
              <TouchableOpacity
                style={styles.openButton}
                onPress={() => handleOpenFaucet(faucet.url)}
              >
                <Text style={styles.openButtonText}>Open Faucet</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="water-drop" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No faucets available for this token</Text>
          </View>
        )}
      </ScrollView>

      {/* Payment Method Selection Modal */}
      <Modal visible={paymentMethodSheetVisible} transparent animationType="fade" onRequestClose={() => setPaymentMethodSheetVisible(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setPaymentMethodSheetVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Payment Method</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPaymentMethodSheetVisible(false)}>
                <Icon name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {loadingPaymentMethods ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>Loading payment methods...</Text>
              </View>
            ) : paymentMethods.length > 0 ? (
              <FlatList
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}
                data={paymentMethods}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.paymentMethodItem}
                    onPress={() => {
                      setSelectedPaymentMethod(item);
                      setPaymentMethodSheetVisible(false);
                    }}
                  >
                    <View style={styles.paymentMethodItemContent}>
                      <Icon name={PaymentMethodService.getInstance().getPaymentMethodIcon(item)} size={24} color={theme.colors.primary} />
                      <View style={styles.paymentMethodDetails}>
                        <Text style={styles.paymentMethodName}>{item.name}</Text>
                        <Text style={styles.paymentMethodDescription}>
                          {PaymentMethodService.getInstance().formatPaymentMethod(item)}
                        </Text>
                      </View>
                    </View>
                    {selectedPaymentMethod?._id === item._id && (
                      <Icon name="check" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                initialNumToRender={10}
                windowSize={5}
                removeClippedSubviews
                maxToRenderPerBatch={10}
              />
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Icon name="payment" size={48} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  No payment methods available.{'\n'}
                  Add payment methods in Settings to top up your wallet.
                </Text>
                <TouchableOpacity
                  style={styles.addPaymentButton}
                  onPress={() => {
                    setPaymentMethodSheetVisible(false);
                    navigation.navigate('PaymentMethods');
                  }}
                >
                  <Text style={styles.addPaymentButtonText}>Add Payment Method</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
