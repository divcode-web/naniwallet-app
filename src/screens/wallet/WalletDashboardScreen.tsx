import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  BackHandler,
  Image,
  Animated,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useWeb3Auth } from '../../context/Web3AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Clipboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TokenService, { NetworkToken } from '../../services/tokenService';
import NetworkService, { NetworkChain } from '../../services/networkService';
import BTCBalanceService from '../../services/btcBalanceService';
import ETHBalanceService from '../../services/ethBalanceService';
import SOLBalanceService from '../../services/solBalanceService';
import TokenAddressService from '../../services/tokenAddressService';

interface WalletDashboardScreenProps {
  navigation: any;
}

export const WalletDashboardScreen: React.FC<WalletDashboardScreenProps> = ({
  navigation,
}) => {
  const { theme } = useTheme();
  const { wallet, wallets, getWalletBalance, removeWallet } = useWeb3Auth();
  const { formatPrice, currencyInfo } = useCurrency();
  const [balance, setBalance] = useState('0.0'); // Keep for legacy
  const [totalUSDValue, setTotalUSDValue] = useState(0); // New USD total
  const [networkLabel, setNetworkLabel] = useState('All Network');
  const [networkSheetVisible, setNetworkSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [hideSmallAssets, setHideSmallAssets] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  const [selectedTokens, setSelectedTokens] = useState<NetworkToken[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedTokenForAction, setSelectedTokenForAction] =
    useState<NetworkToken | null>(null);

  useEffect(() => {
    setHasSelection(selectedTokens.length > 0);
  }, [selectedTokens]);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [chains, setChains] = useState<NetworkChain[]>([]);
  const [chainsLoading, setChainsLoading] = useState<boolean>(false);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1400),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(''));
  };

  const loadSelectedTokens = async () => {
    try {
      const ids = await AsyncStorage.getItem('selected_token_ids');
      if (ids) {
        // Sanitize and normalize the saved selection
        const raw: unknown = JSON.parse(ids);
        const list: string[] = Array.isArray(raw)
          ? (raw as unknown[])
              .map(v => String(v).trim())
              .filter(v => v.length > 0)
          : [];
        if (!Array.isArray(list) || list.length === 0) {
          setSelectedTokens([]);
          setHasSelection(false);
          try {
            await AsyncStorage.removeItem('selected_token_ids');
          } catch {}
          return;
        }
        setHasSelection(true);
        // Try cache first to avoid rate limits and speed up render
        let real = await TokenService.getCachedTokens('ethereum', 200);
        if (real && real.length) {
          real = real.filter(
            t =>
              list.includes(String(t.id)) ||
              list.includes(String(t.symbol).toLowerCase()),
          );
        }
        // If cache miss or incomplete, fetch by ids
        if (!real || real.length === 0) {
          real = await TokenService.fetchTokensByIds(list);
        }

        // Normalize selected list to symbols we support (BTC/ETH/SOL)
        const toSymbol = (v: string) => {
          const s = String(v).toLowerCase();
          if (s === 'btc' || s === 'bitcoin') return 'BTC';
          if (s === 'eth' || s === 'ethereum') return 'ETH';
          if (s === 'sol' || s === 'solana') return 'SOL';
          return s.toUpperCase();
        };
        const desiredSymbols = Array.from(
          new Set(list.map((v: string) => toSymbol(v))),
        ).filter(s => ['BTC', 'ETH', 'SOL'].includes(s));
        if (desiredSymbols.length === 0) {
          setSelectedTokens([]);
          setHasSelection(false);
          try {
            await AsyncStorage.removeItem('selected_token_ids');
          } catch {}
          return;
        }

        // Prefer snapshotted prices from selector if present to keep change rates consistent
        let snapshot: NetworkToken[] = [];
        try {
          const snap = await AsyncStorage.getItem('selectedTokens');
          if (snap) snapshot = JSON.parse(snap);
        } catch {}

        // Prefer API data; fallback to defaults for missing symbols
        const defaultsBySymbol: Record<string, NetworkToken> = {
          BTC: {
            id: 'bitcoin',
            symbol: 'BTC',
            name: 'Bitcoin',
            priceUSDT: 0,
            changePct24h: 0,
            color: '#F7931A',
            iconUrl:
              'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
          },
          ETH: {
            id: 'ethereum',
            symbol: 'ETH',
            name: 'Ethereum',
            priceUSDT: 0,
            changePct24h: 0,
            color: '#627EEA',
            iconUrl:
              'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
          },
          SOL: {
            id: 'solana',
            symbol: 'SOL',
            name: 'Solana',
            priceUSDT: 0,
            changePct24h: 0,
            color: '#9945FF',
            iconUrl:
              'https://assets.coingecko.com/coins/images/4128/large/solana.png',
          },
        };

        const bySymbol: Record<string, NetworkToken> = {};
        for (const t of real) {
          const sym = String(t.symbol).toUpperCase();
          if (['BTC', 'ETH', 'SOL'].includes(sym)) {
            // If multiple, keep the first (API order), but overwrite defaults later
            if (!bySymbol[sym]) bySymbol[sym] = t;
          }
        }
        // Overwrite with snapshot if available to keep same pricing/change values
        for (const s of snapshot) {
          const sym = String(s.symbol).toUpperCase();
          if (['BTC', 'ETH', 'SOL'].includes(sym)) {
            bySymbol[sym] = { ...bySymbol[sym], ...s };
          }
        }
        // Fill missing symbols from defaults
        for (const sym of desiredSymbols) {
          if (!bySymbol[sym]) bySymbol[sym] = defaultsBySymbol[sym];
        }

        // Order strictly BTC, ETH, SOL but include only those selected
        const orderSymbols = ['BTC', 'ETH', 'SOL'].filter(s =>
          desiredSymbols.includes(s),
        );
        const final = orderSymbols
          .map(sym => bySymbol[sym])
          .filter(Boolean) as NetworkToken[];

        if (!final.length) {
          setSelectedTokens([]);
          setHasSelection(false);
          try {
            await AsyncStorage.removeItem('selected_token_ids');
          } catch {}
        } else {
          setSelectedTokens(final);
        }
      } else {
        setSelectedTokens([]);
        setHasSelection(false);
      }
    } catch {
      setSelectedTokens([]);
      setHasSelection(false);
    }
  };

  const loadSelectedTokensAndRefresh = async () => {
    try {
      const ids = await AsyncStorage.getItem('selected_token_ids');
      if (ids) {
        // Sanitize and normalize the saved selection
        const raw: unknown = JSON.parse(ids);
        const list: string[] = Array.isArray(raw)
          ? (raw as unknown[])
              .map(v => String(v).trim())
              .filter(v => v.length > 0)
          : [];
        if (!Array.isArray(list) || list.length === 0) {
          setSelectedTokens([]);
          setHasSelection(false);
          try {
            await AsyncStorage.removeItem('selected_token_ids');
          } catch {}
          return;
        }
        setHasSelection(true);

        // Fetch fresh market data directly using CoinGecko IDs
        const coingeckoIds = ['bitcoin', 'ethereum', 'solana'];
        const freshMarketData = await TokenService.fetchTokensByIds(
          coingeckoIds,
        );

        if (freshMarketData && freshMarketData.length > 0) {
          // Create tokens with fresh market data
          const tokensWithFreshData: NetworkToken[] = [];

          // Normalize selected list to symbols we support (BTC/ETH/SOL)
          const toSymbol = (v: string) => {
            const s = String(v).toLowerCase();
            if (s === 'btc' || s === 'bitcoin') return 'BTC';
            if (s === 'eth' || s === 'ethereum') return 'ETH';
            if (s === 'sol' || s === 'solana') return 'SOL';
            return s.toUpperCase();
          };
          const desiredSymbols = Array.from(
            new Set(list.map((v: string) => toSymbol(v))),
          ).filter(s => ['BTC', 'ETH', 'SOL'].includes(s));

          // Create token objects with fresh market data
          const defaultsBySymbol: Record<string, NetworkToken> = {
            BTC: {
              id: 'bitcoin',
              symbol: 'BTC',
              name: 'Bitcoin',
              priceUSDT: 0,
              changePct24h: 0,
              color: '#F7931A',
              iconUrl:
                'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            },
            ETH: {
              id: 'ethereum',
              symbol: 'ETH',
              name: 'Ethereum',
              priceUSDT: 0,
              changePct24h: 0,
              color: '#627EEA',
              iconUrl:
                'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
            },
            SOL: {
              id: 'solana',
              symbol: 'SOL',
              name: 'Solana',
              priceUSDT: 0,
              changePct24h: 0,
              color: '#9945FF',
              iconUrl:
                'https://assets.coingecko.com/coins/images/4128/large/solana.png',
            },
          };

          // Map fresh market data to tokens
          const freshBySymbol: Record<string, NetworkToken> = {};
          for (const fresh of freshMarketData) {
            const sym = String(fresh.symbol).toUpperCase();
            if (['BTC', 'ETH', 'SOL'].includes(sym)) {
              freshBySymbol[sym] = {
                ...defaultsBySymbol[sym],
                ...fresh,
                id: fresh.id,
                symbol: fresh.symbol,
                name: fresh.name,
                priceUSDT: fresh.priceUSDT,
                changePct24h: fresh.changePct24h,
                iconUrl: fresh.iconUrl || defaultsBySymbol[sym].iconUrl,
              };
            }
          }

          // Fill missing symbols from defaults
          for (const sym of desiredSymbols) {
            if (!freshBySymbol[sym]) {
              freshBySymbol[sym] = defaultsBySymbol[sym];
            }
          }

          // Order strictly BTC, ETH, SOL but include only those selected
          const orderSymbols = ['BTC', 'ETH', 'SOL'].filter(s =>
            desiredSymbols.includes(s),
          );
          const final = orderSymbols
            .map(sym => freshBySymbol[sym])
            .filter(Boolean) as NetworkToken[];

          if (!final.length) {
            setSelectedTokens([]);
            setHasSelection(false);
            try {
              await AsyncStorage.removeItem('selected_token_ids');
            } catch {}
          } else {
            setSelectedTokens(final);
            console.log(
              '✅ Loaded tokens with fresh market data:',
              final.map(
                t => `${t.symbol}: $${t.priceUSDT} (${t.changePct24h}%)`,
              ),
            );
          }
        } else {
          // Fallback to original method if API fails
          await loadSelectedTokens();
        }
      } else {
        setSelectedTokens([]);
        setHasSelection(false);
      }
    } catch (error) {
      console.error('Failed to load tokens with fresh data:', error);
      // Fallback to original method
      await loadSelectedTokens();
    }
  };

  useEffect(() => {
    loadSelectedTokens();
  }, []);

  // No automatic refresh on screen focus - balances load once when wallet changes

  // No automatic background refresh - only manual refresh by user
  // Balances are loaded once when wallet changes and tokens are selected
  // User can manually refresh using the refresh button

  useEffect(() => {
    if (wallet) {
      console.log(`🔄 Wallet changed to: ${wallet.address}`);
      // Load balances silently without clearing first (no loading state)
      loadWalletBalance();
      loadTokenBalances();
    } else {
      console.log('🔄 No wallet selected');
      setBalance('0.0');
      setBalances({});
    }
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wallet && selectedTokens.length > 0) {
      console.log(
        `🔄 Selected tokens changed, loading balances silently for: ${wallet.address}`,
      );
      loadTokenBalances();
    } else {
      setBalances({});
    }
  }, [selectedTokens, wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        setChainsLoading(true);
        const all = await NetworkService.fetchChainsCached();
        setChains([{ id: 'all', name: 'All Network' }, ...all]);
      } finally {
        setChainsLoading(false);
      }
    })();
  }, []);

  const renderChainItem = ({ item }: { item: NetworkChain }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.chainItem}
      onPress={() => {
        setNetworkLabel(item.name);
        setNetworkSheetVisible(false);
      }}
    >
      <View style={styles.chainIconWrap}>
        {item.iconUrl ? (
          <Image source={{ uri: item.iconUrl }} style={styles.chainIconImg} />
        ) : (
          <Icon name="all-inclusive" size={20} color={theme.colors.text} />
        )}
      </View>
      <Text style={styles.chainName}>{item.name}</Text>
    </TouchableOpacity>
  );

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.navigate('Home');
        return true; // Prevent default back action
      },
    );

    return () => backHandler.remove();
  }, [navigation]);

  const loadWalletBalance = async () => {
    try {
      // Skip fetching if wallet is not connected
      if (!wallet) {
        console.log('No wallet connected, setting balance to 0');
        setBalance('0.0');
        return;
      }

      console.log(`🔄 Loading fresh balance for wallet: ${wallet.address}`);

      // Clear cache for this wallet to ensure fresh data
      const ethService = ETHBalanceService.getInstance();
      ethService.clearCache();

      // Try to get ETH balance first (since this is primarily an ETH wallet)
      try {
        const ethBalance = await ethService.getETHBalance(
          wallet.address,
          'sepolia',
        );
        const formattedBalance = ethBalance.balance.toFixed(6);
        setBalance(formattedBalance);
        console.log(
          `✅ Fresh ETH balance: ${formattedBalance} ETH for ${wallet.address}`,
        );
      } catch (ethError) {
        console.warn(
          'Failed to get ETH balance, falling back to default:',
          ethError,
        );
        // Fallback to the original wallet balance method
        const walletBalance = await getWalletBalance();
        setBalance(walletBalance);
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
      setBalance('0.0');
    }
  };

  const loadTokenBalances = async () => {
    try {
      if (!wallet || !selectedTokens.length) {
        console.log('No wallet or tokens selected, clearing balances');
        setBalances({});
        setTotalUSDValue(0);
        return;
      }

      console.log(
        `🔄 Loading fresh token balances for wallet: ${wallet.address}`,
      );
      console.log(
        `Selected tokens:`,
        selectedTokens.map(t => t.symbol),
      );

      const newBalances: Record<string, number> = {};
      const btcService = BTCBalanceService.getInstance();
      const ethService = ETHBalanceService.getInstance();
      const solService = SOLBalanceService.getInstance();
      const addressService = TokenAddressService.getInstance();

      // Clear caches to ensure fresh data
      ethService.clearCache();
      btcService.clearCache();
      solService.clearCache();

      // Load balances for each selected token
      for (const token of selectedTokens) {
        try {
          if (token.symbol.toUpperCase() === 'BTC') {
            // Get BTC address from mnemonic
            const addressInfo = await addressService.getTokenAddressInfo(
              token,
              wallet.mnemonic,
            );
            if (addressInfo?.address) {
              const btcBalance = await btcService.getBTCBalance(
                addressInfo.address,
                true,
              ); // Use testnet
              newBalances[token.id] = btcBalance.balance;
              console.log(
                `✅ BTC Balance for ${addressInfo.address}: ${btcBalance.balance} BTC`,
              );
            } else {
              newBalances[token.id] = 0;
              console.log(`❌ No BTC address found for wallet`);
            }
          } else if (token.symbol.toUpperCase() === 'ETH') {
            // Get ETH balance directly from wallet address (Sepolia testnet)
            const ethBalance = await ethService.getETHBalance(
              wallet.address,
              'sepolia',
            );
            newBalances[token.id] = ethBalance.balance;
            console.log(
              `✅ ETH Balance for ${wallet.address}: ${ethBalance.balance} ETH`,
            );
          } else if (token.symbol.toUpperCase() === 'SOL') {
            // Get SOL address from mnemonic
            const addressInfo = await addressService.getTokenAddressInfo(
              token,
              wallet.mnemonic,
            );
            if (addressInfo?.address) {
              const solBalance = await solService.getSOLBalance(
                addressInfo.address,
                'devnet',
              );
              newBalances[token.id] = solBalance.balance;
              console.log(
                `✅ SOL Balance for ${addressInfo.address}: ${solBalance.balance} SOL`,
              );
            } else {
              newBalances[token.id] = 0;
              console.log(`❌ No SOL address found for wallet`);
            }
          } else {
            // For other tokens, set to 0 for now (can be extended later)
            newBalances[token.id] = 0;
            console.log(
              `ℹ️ Token ${token.symbol} balance set to 0 (not implemented)`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Failed to load balance for ${token.symbol}:`,
            error,
          );
          newBalances[token.id] = 0;
        }
      }

      console.log(`Final token balances:`, newBalances);
      setBalances(newBalances);

      // Calculate total USD value
      calculateTotalUSDValue(newBalances, selectedTokens);
    } catch (error) {
      console.error('❌ Failed to load token balances:', error);
      setBalances({});
      setTotalUSDValue(0);
    }
  };

  const calculateTotalUSDValue = (
    balances: Record<string, number>,
    tokens: NetworkToken[],
  ) => {
    let total = 0;

    for (const token of tokens) {
      const balance = balances[token.id] || 0;
      const price = token.priceUSDT || 0;
      const usdValue = balance * price;
      total += usdValue;
      console.log(
        `💰 ${token.symbol}: ${balance} * $${price} = $${usdValue.toFixed(2)}`,
      );
    }

    console.log(`💰 Total USD Value: $${total.toFixed(2)}`);
    setTotalUSDValue(total);
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Manual refresh triggered by user');

      // Clear all caches to ensure fresh data
      const ethService = ETHBalanceService.getInstance();
      const btcService = BTCBalanceService.getInstance();
      const solService = SOLBalanceService.getInstance();

      ethService.clearCache();
      btcService.clearCache();
      solService.clearCache();

      console.log('✅ All caches cleared for manual refresh');

      // Force fresh data loading
      await Promise.all([
        loadWalletBalance(),
        loadTokenBalances(),
        refreshMarketData(),
      ]);

      console.log('✅ Manual refresh completed');
      showToast('Balances updated');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      showToast('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // Scroll handling removed - no automatic refresh on scroll

  const refreshMarketData = async () => {
    try {
      if (!selectedTokens.length) return;
      // Use exact Coingecko IDs to ensure parity across screens
      const toId = (sym: string) => {
        const s = String(sym).toUpperCase();
        if (s === 'BTC') return 'bitcoin';
        if (s === 'ETH') return 'ethereum';
        if (s === 'SOL') return 'solana';
        return '';
      };
      const ids = Array.from(
        new Set(selectedTokens.map(t => toId(t.symbol)).filter(Boolean)),
      );
      if (!ids.length) return;
      const fresh = await TokenService.fetchTokensByIds(ids);
      if (!fresh || !fresh.length) return;
      const bySym: Record<string, (typeof fresh)[number]> = {};
      for (const f of fresh) {
        const sym = String(f.symbol).toUpperCase();
        bySym[sym] = f;
      }
      setSelectedTokens(prev =>
        prev.map(t => {
          const sym = String(t.symbol).toUpperCase();
          const f = bySym[sym];
          return f
            ? {
                ...t,
                priceUSDT: f.priceUSDT,
                changePct24h: f.changePct24h,
                iconUrl: f.iconUrl || t.iconUrl,
              }
            : t;
        }),
      );
    } catch {}
  };

  const handleSendMoney = () => {
    navigation.navigate('SelectSendToken');
  };

  const handleReceiveMoney = () => {
    navigation.navigate('SelectReceiveToken');
  };

  const handleTokenAction = (
    token: NetworkToken,
    action: 'send' | 'topup' | 'receive',
  ) => {
    setActionMenuVisible(false);
    setSelectedTokenForAction(null);

    switch (action) {
      case 'send':
        navigation.navigate('SendDialog', { token });
        break;
      case 'topup':
        navigation.navigate('TopUp', { token });
        break;
      case 'receive':
        navigation.navigate('ReceiveDialog', { token });
        break;
    }
  };

  const showTokenActionMenu = (token: NetworkToken) => {
    setSelectedTokenForAction(token);
    setActionMenuVisible(true);
  };

  const handleViewTransactions = () => {
    navigation.navigate('TransactionHistory');
  };

  const handleDisconnectWallet = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = wallet?.id || wallet?.address;
              if (id) {
                await removeWallet(id);
              }
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'WalletSetup' as never,
                    params: { fromMain: true } as never,
                  },
                ],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect wallet');
            }
          },
        },
      ],
    );
  };

  const formatAddress = (address: string) => {
    if (!address) return 'No Address';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flex: 1,
    },
    header: {
      backgroundColor: theme.colors.surface,
      paddingTop: 16,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backButton: { padding: 8, marginRight: 12 },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    headerSubtitleRow: { flexDirection: 'row', alignItems: 'center' },
    headerSubtitle: { fontSize: 12, color: theme.colors.textSecondary },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    addressRow: { flexDirection: 'row', alignItems: 'center' },
    vDivider: {
      width: 1,
      height: 14,
      backgroundColor: theme.colors.border,
      marginRight: 7,
    },
    networkPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      marginRight: 8,
    },
    networkText: {
      color: theme.colors.primary,
      fontWeight: '700',
      marginRight: 2,
    },
    headerIconBtn: { padding: 8, marginLeft: 3 },
    headerIconTight: { paddingVertical: 0 },
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
    sheetScroll: { paddingHorizontal: 16, paddingTop: 12 },
    chainItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    chainIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.textSecondary + '22',
      marginRight: 12,
    },
    chainIconImg: { width: 24, height: 24, borderRadius: 12 },
    chainName: { color: theme.colors.text, fontWeight: '600' },
    balanceCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 20,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: theme.isDark ? 0.25 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bigBalance: { fontSize: 32, fontWeight: '800', color: theme.colors.text },
    eyeButton: { padding: 6, borderRadius: 16 },
    refreshButton: { padding: 6, borderRadius: 16, marginLeft: 8 },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    pillButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    pillPrimary: { backgroundColor: theme.colors.primary },
    pillDark: { backgroundColor: theme.colors.text },
    pillBordered: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    pillTextLight: { color: theme.colors.white, fontWeight: '700' },
    pillTextDark: { color: theme.colors.text, fontWeight: '700' },
    tabsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginTop: 20,
      alignItems: 'center',
    },
    tabText: {
      marginRight: 16,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    tabTextActive: { color: theme.colors.text },
    hideRowWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: 16,
      marginTop: 12,
    },
    hideSmallRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    plusButton: { paddingHorizontal: 10, paddingVertical: 8, marginLeft: 8 },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    tokenIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    tokenSymbol: { color: theme.colors.text, fontWeight: '700' },
    tokenMidCol: { flex: 1 },
    tokenNameRow: { flexDirection: 'row', alignItems: 'center' },
    tokenPriceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    tokenPriceText: { color: theme.colors.textSecondary, marginRight: 10 },
    tokenRightCol: { marginLeft: 'auto', alignItems: 'flex-end' },
    tokenRightFiat: { alignItems: 'flex-end' },
    pctGreen: { color: theme.colors.success },
    pctRed: { color: theme.colors.error },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginHorizontal: 16,
    },
    emptyNfts: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 60,
    },
    emptyText: { marginTop: 16, color: theme.colors.textSecondary },
    menuContainer: { margin: 20 },
    menuItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    menuIcon: {
      marginRight: 16,
    },
    menuText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      flex: 1,
    },
    menuArrow: {
      marginLeft: 8,
    },
    disconnectButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      margin: 20,
    },
    disconnectButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
    toastContainer: {
      position: 'absolute',
      bottom: 40,
      alignSelf: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.25 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    toastText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 8,
    },
    globalLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionMenuContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '40%',
      marginTop: 'auto',
    },
    actionMenuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    actionMenuTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    actionMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    actionMenuItemText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 16,
    },
  });

  if (!wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Icon name="arrow-back" size={24} color={theme.colors.white} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>No Wallet Connected</Text>
              <Text style={styles.headerSubtitle}>
                Please set up your wallet first
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('WalletSetup')}
          >
            <Icon
              name="account-balance-wallet"
              size={24}
              color={theme.colors.primary}
              style={styles.menuIcon}
            />
            <Text style={styles.menuText}>Set Up Wallet</Text>
            <Icon
              name="chevron-right"
              size={24}
              color={theme.colors.textSecondary}
              style={styles.menuArrow}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Icon name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerTitle}>{wallet?.name || 'Wallet'}</Text>
              <TouchableOpacity
                style={[styles.headerIconBtn, styles.headerIconTight]}
                onPress={() => navigation.navigate('WalletSelect')}
              >
                <Icon
                  name="arrow-drop-down"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.headerSubtitleRow}>
              <View style={styles.addressRow}>
                <Text style={styles.headerSubtitle}>
                  {formatAddress(wallet?.address || '')}
                </Text>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => {
                    Clipboard.setString(wallet?.address || '');
                    showToast('Address copied to clipboard');
                  }}
                >
                  <Icon
                    name="content-copy"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.vDivider} />
              {/* <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setNetworkSheetVisible(true)}
                style={[styles.networkPill, { backgroundColor: theme.colors.primary + '15' }]}
              >
                <Text style={styles.networkText}>{networkLabel}</Text>
                <Icon name="arrow-drop-down" size={18} color={theme.colors.primary} />
              </TouchableOpacity> */}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => showToast('Coming soon')}
            >
              <Icon name="history" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Notification')}
            >
              <Icon
                name="notifications-none"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <Text style={styles.bigBalance}>
              {isBalanceHidden ? '•••••' : formatPrice(totalUSDValue)}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setIsBalanceHidden(v => !v)}
              >
                <Icon
                  name={isBalanceHidden ? 'visibility-off' : 'visibility'}
                  size={22}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={onRefresh}
              >
                <Icon name="refresh" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          {/* Inline spinner removed; using full-screen overlay below */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.pillButton, styles.pillBordered]}
              onPress={handleSendMoney}
            >
              <Text
                style={[styles.pillTextDark, { color: theme.colors.primary }]}
              >
                Send
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pillButton, styles.pillPrimary]}
              onPress={handleReceiveMoney}
            >
              <Text style={styles.pillTextLight}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pillButton, styles.pillPrimary]}
              onPress={() => navigation.navigate('TopUp')}
            >
              <Text style={styles.pillTextLight}>Top Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity onPress={() => setActiveTab('tokens')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'tokens' && styles.tabTextActive,
              ]}
            >
              Token
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('nfts')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'nfts' && styles.tabTextActive,
              ]}
            >
              NFTs
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'tokens' && (
          <>
            <View style={styles.hideRowWrap}>
              <View style={styles.hideSmallRow}>
                <Text style={{ color: theme.colors.text }}>
                  Hide Small Asset
                </Text>
                <TouchableOpacity onPress={() => setHideSmallAssets(v => !v)}>
                  <Icon
                    name={hideSmallAssets ? 'toggle-on' : 'toggle-off'}
                    size={38}
                    color={
                      hideSmallAssets
                        ? theme.colors.primary
                        : theme.colors.border
                    }
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.plusButton}
                onPress={() => navigation.navigate('SelectToken')}
              >
                <Icon name="add" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {console.log('selectedTokens', selectedTokens)}
            {console.log('hasSelection', hasSelection)}

            {(selectedTokens.length > 0 ? selectedTokens : [])
              .filter(t => !hideSmallAssets || (balances[t.id] || 0) > 0)
              .map((t, idx) => (
                <View key={`${String(t.id).toLowerCase()}-${idx}`}>
                  <TouchableOpacity
                    style={styles.tokenRow}
                    onPress={() => showTokenActionMenu(t)}
                    activeOpacity={0.7}
                  >
                    {t.iconUrl ? (
                      <Image
                        source={{ uri: t.iconUrl }}
                        style={[styles.tokenIcon, { borderRadius: 14 }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.tokenIcon,
                          { backgroundColor: t.color + '33' },
                        ]}
                      >
                        <Text style={{ color: t.color, fontWeight: '800' }}>
                          {t.symbol.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.tokenMidCol}>
                      <View style={styles.tokenNameRow}>
                        <Text style={styles.tokenSymbol}>{t.symbol}</Text>
                      </View>
                      <View style={styles.tokenPriceRow}>
                        <Text style={styles.tokenPriceText}>
                          {formatPrice(t.priceUSDT || 0)}
                        </Text>
                        <Text
                          style={
                            (t.changePct24h || 0) >= 0
                              ? styles.pctGreen
                              : styles.pctRed
                          }
                        >
                          {`${(t.changePct24h || 0) >= 0 ? '+' : ''}${
                            t.changePct24h || 0
                          }%`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.tokenRightCol}>
                      <Text style={{ color: theme.colors.text }}>
                        {t.symbol === 'BTC'
                          ? `${(balances[t.id] || 0).toFixed(8)} BTC`
                          : t.symbol === 'ETH'
                          ? `${(balances[t.id] || 0).toFixed(6)} ETH`
                          : t.symbol === 'SOL'
                          ? `${(balances[t.id] || 0).toFixed(6)} SOL`
                          : `${balances[t.id] || 0}`}
                      </Text>
                      <Text style={[{ color: theme.colors.textSecondary }]}>
                        {formatPrice(
                          (balances[t.id] || 0) * (t.priceUSDT || 0),
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {idx < selectedTokens.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
          </>
        )}

        {activeTab === 'nfts' && (
          <View style={styles.emptyNfts}>
            <Icon
              name="receipt-long"
              size={96}
              color={theme.colors.textSecondary + '66'}
            />
            <Text style={styles.emptyText}>There's nothing here</Text>
          </View>
        )}
      </ScrollView>

      {balanceLoading && (
        <View style={styles.globalLoadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {toastMessage !== '' && (
        <Animated.View
          style={[styles.toastContainer, { opacity: toastOpacity }]}
        >
          <Icon name="check" size={18} color={theme.colors.primary} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <Modal
        visible={networkSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNetworkSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setNetworkSheetVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Chain</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setNetworkSheetVisible(false)}
              >
                <Icon name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {chainsLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              <FlatList
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 8,
                }}
                data={chains}
                keyExtractor={item => item.id}
                renderItem={renderChainItem}
                initialNumToRender={20}
                windowSize={10}
                removeClippedSubviews
                maxToRenderPerBatch={20}
                updateCellsBatchingPeriod={50}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Token Action Menu Modal */}
      <Modal
        visible={actionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setActionMenuVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.actionMenuContainer}
          >
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuTitle}>
                {selectedTokenForAction?.symbol} Actions
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setActionMenuVisible(false)}
              >
                <Icon name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() =>
                selectedTokenForAction &&
                handleTokenAction(selectedTokenForAction, 'send')
              }
            >
              <Icon name="send" size={24} color={theme.colors.primary} />
              <Text style={styles.actionMenuItemText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() =>
                selectedTokenForAction &&
                handleTokenAction(selectedTokenForAction, 'topup')
              }
            >
              <Icon name="add-circle" size={24} color={theme.colors.success} />
              <Text style={styles.actionMenuItemText}>Top Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() =>
                selectedTokenForAction &&
                handleTokenAction(selectedTokenForAction, 'receive')
              }
            >
              <Icon
                name="call-received"
                size={24}
                color={theme.colors.accent}
              />
              <Text style={styles.actionMenuItemText}>Receive</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
