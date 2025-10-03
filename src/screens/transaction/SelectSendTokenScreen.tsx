import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useWeb3Auth } from '../../context/Web3AuthContext';
import { t } from '../../i18n';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TokenService, { NetworkToken } from '../../services/tokenService';
import AsyncStorage from '@react-native-async-storage/async-storage';


interface SelectSendTokenScreenProps {
  navigation: any;
}

export const SelectSendTokenScreen: React.FC<SelectSendTokenScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { locale } = useLocale();
  const { formatPrice } = useCurrency();
  const { activeWallet } = useWeb3Auth();
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<NetworkToken[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserTokens();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      // Refresh market data when screen is focused
      await loadUserTokens();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserTokens = async () => {
    try {
      setLoading(true);
      
      // Fetch fresh market data for BTC, ETH, SOL
      const coingeckoIds = ['bitcoin', 'ethereum', 'solana'];
      let freshTokens = await TokenService.fetchTokensByIds(coingeckoIds);
      
      if (!freshTokens || freshTokens.length === 0) {
        // Fallback to cached data if API fails
        const selectedTokensData = await AsyncStorage.getItem('selectedTokens');
        if (selectedTokensData) {
          freshTokens = JSON.parse(selectedTokensData);
        }
      }

      // Create tokens with fresh market data or defaults
      const defaultsBySymbol: Record<string, NetworkToken> = {
        BTC: { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', priceUSDT: 0, changePct24h: 0, color: '#F7931A', iconUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
        ETH: { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', priceUSDT: 0, changePct24h: 0, color: '#627EEA', iconUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
        SOL: { id: 'solana', symbol: 'SOL', name: 'Solana', priceUSDT: 0, changePct24h: 0, color: '#9945FF', iconUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
      };

      const bySymbol: Record<string, NetworkToken> = {};
      
      // Map fresh market data to tokens
      if (freshTokens && freshTokens.length > 0) {
        for (const fresh of freshTokens) {
          const sym = String(fresh.symbol).toUpperCase();
          if (['BTC','ETH','SOL'].includes(sym)) {
            bySymbol[sym] = {
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
      }

      // Fill missing symbols from defaults
      const desiredSymbols = ['BTC', 'ETH', 'SOL'];
      for (const sym of desiredSymbols) {
        if (!bySymbol[sym]) {
          bySymbol[sym] = defaultsBySymbol[sym];
        }
      }

      // Order strictly BTC, ETH, SOL
      const final = desiredSymbols.map(sym => bySymbol[sym]).filter(Boolean) as NetworkToken[];

      // Load balances for each token - set all to 0 for send screen
      const tokenBalances: Record<string, number> = {};
      for (const token of final) {
        tokenBalances[token.id] = 0; // All tokens have 0 balance for sending
      }
      setBalances(tokenBalances);
      setTokens(final);
      
      console.log('✅ Loaded send tokens with fresh market data:', final.map(t => `${t.symbol}: $${t.priceUSDT} (${t.changePct24h}%)`));
    } catch (error) {
      console.error('Error loading user tokens:', error);
      // Fallback to mock data
      loadMockTokens();
    } finally {
      setLoading(false);
    }
  };

  const loadMockTokens = () => {
    // Only show BTC, ETH, and SOL tokens for sending
    const mockTokens: NetworkToken[] = [
      {
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        priceUSDT: 0,
        changePct24h: 0,
        color: '#F7931A',
        iconUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      },
      {
        id: 'ethereum',
        symbol: 'ETH',
        name: 'Ethereum',
        priceUSDT: 0,
        changePct24h: 0,
        color: '#627EEA',
        iconUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      },
      {
        id: 'solana',
        symbol: 'SOL',
        name: 'Solana',
        priceUSDT: 0,
        changePct24h: 0,
        color: '#9945FF',
        iconUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
      },
    ];
    
    // Set all balances to 0 for mock tokens
    const mockBalances: Record<string, number> = {
      'bitcoin': 0,
      'ethereum': 0,
      'solana': 0,
    };
    
    setTokens(mockTokens);
    setBalances(mockBalances);
  };

  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTokenSelect = (token: NetworkToken) => {
    // Navigate to send dialog with selected token
    navigation.navigate('SendDialog', { token });
  };

  const TokenListItem: React.FC<{ item: NetworkToken; onPress: () => void }> = ({ item, onPress }) => {
    const [imageError, setImageError] = useState(false);

    const getTokenIconUrl = (tokenId: string) => {
      const iconUrls = {
        'bitcoin': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        'ethereum': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
        'solana': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
        'btc': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        'eth': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
        'sol': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
      } as Record<string, string | undefined>;
      return iconUrls[tokenId.toLowerCase()];
    };

    const iconUrl = item.iconUrl || getTokenIconUrl(item.id);

    return (
      <TouchableOpacity
        style={[styles.tokenItem, { borderBottomColor: theme.colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.tokenLeft}>
          {!imageError && iconUrl ? (
            <Image
              source={{ uri: iconUrl }}
              style={[styles.tokenIcon, { borderRadius: 16 }]}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.tokenIcon, { backgroundColor: item.color + '20' }]}>
              <Text style={{ color: item.color, fontWeight: '900', fontSize: 16 }}>{item.symbol.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.tokenInfo}>
            <Text style={[styles.tokenSymbol, { color: theme.colors.text }]}>{item.symbol}</Text>
            <View style={styles.tokenPriceRow}>
              <Text style={[styles.tokenPrice, { color: theme.colors.textSecondary }]}>{formatPrice(item.priceUSDT || 0)}</Text>
              <Text style={[styles.tokenChange, { color: (item.changePct24h || 0) >= 0 ? theme.colors.success : theme.colors.error }]}>
                {`${(item.changePct24h || 0) >= 0 ? '+' : ''}${item.changePct24h || 0}%`}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTokenItem = ({ item }: { item: NetworkToken }) => (
    <TokenListItem item={item} onPress={() => handleTokenSelect(item)} />
  );


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginVertical: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
    },
    searchIcon: {
      marginRight: 12,
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
    },
    tokenList: {
      flex: 1,
    },
    tokenItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    tokenLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    tokenIcon: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderRadius: 16,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenSymbol: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    tokenPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenPrice: {
      fontSize: 14,
      marginRight: 8,
    },
    tokenChange: {
      fontSize: 14,
      fontWeight: '500',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Token</Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading your tokens...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTokens}
          renderItem={renderTokenItem}
          keyExtractor={(item) => item.id}
          style={styles.tokenList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No tokens found
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};
