import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TokenService, { NetworkToken } from '../../services/tokenService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props { navigation: any }

export const SelectTokenScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { formatPrice } = useCurrency();
  const [query, setQuery] = useState('');
  const [tokens, setTokens] = useState<NetworkToken[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        // Fetch the exact ids we display to keep parity with dashboard
        const ids = ['bitcoin','ethereum','solana'];
        let tks = await TokenService.fetchTokensByIds(ids);
        if (!tks || !tks.length) {
          // fallback to broader cache
          tks = await TokenService.getCachedTokens('ethereum', 200);
        }

        // Allow only BTC, ETH, SOL (use CoinGecko ids for parity with dashboard)
        const allowedIds = ['bitcoin', 'ethereum', 'solana'];
        const allowedSymbols = ['BTC', 'ETH', 'SOL'];
        let filtered = tks.filter(
          (t) => allowedIds.includes(String(t.id).toLowerCase()) || allowedSymbols.includes(String(t.symbol).toUpperCase())
        );

        // If not all are present from API, compose defaults for any missing
        const defaults: NetworkToken[] = [
          { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', priceUSDT: 0, changePct24h: 0, color: '#F7931A', iconUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
          { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', priceUSDT: 0, changePct24h: 0, color: '#627EEA', iconUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
          { id: 'solana', symbol: 'SOL', name: 'Solana', priceUSDT: 0, changePct24h: 0, color: '#9945FF', iconUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
        ];

        const existingIds = new Set(filtered.map((t) => String(t.id).toLowerCase()));
        for (const d of defaults) {
          if (!existingIds.has(d.id)) filtered.push(d);
        }

        // Preserve only the three
        filtered = filtered
          .sort((a, b) => allowedSymbols.indexOf(a.symbol.toUpperCase()) - allowedSymbols.indexOf(b.symbol.toUpperCase()))
          .filter((t, idx, arr) => arr.findIndex((x) => String(x.id).toLowerCase() === String(t.id).toLowerCase()) === idx)
          .filter((t) => allowedIds.includes(String(t.id).toLowerCase()))
          .slice(0, 3);

        if (!filtered.length) setError('Failed to load tokens. Please retry.');
        setTokens(filtered);
      } catch (_e) {
        setError('Failed to load tokens. Please retry.');
        // Fallback to defaults if API fails
        setTokens([
          { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', priceUSDT: 0, changePct24h: 0, color: '#F7931A', iconUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
          { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', priceUSDT: 0, changePct24h: 0, color: '#627EEA', iconUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
          { id: 'solana', symbol: 'SOL', name: 'Solana', priceUSDT: 0, changePct24h: 0, color: '#9945FF', iconUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      // refresh market data each time screen is focused
      try {
        setLoading(true);
        const ids = ['bitcoin','ethereum','solana'];
        let tks = await TokenService.fetchTokensByIds(ids);
        if (!tks || !tks.length) {
          tks = await TokenService.getCachedTokens('ethereum', 200);
        }
        if (tks && tks.length) {
          const allowedIds = ['bitcoin', 'ethereum', 'solana'];
          const allowedSymbols = ['BTC', 'ETH', 'SOL'];
          let filtered = tks.filter(
            (t) => allowedIds.includes(String(t.id).toLowerCase()) || allowedSymbols.includes(String(t.symbol).toUpperCase())
          );
          const defaults: NetworkToken[] = [
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', priceUSDT: 0, changePct24h: 0, color: '#F7931A', iconUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', priceUSDT: 0, changePct24h: 0, color: '#627EEA', iconUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
            { id: 'solana', symbol: 'SOL', name: 'Solana', priceUSDT: 0, changePct24h: 0, color: '#9945FF', iconUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
          ];
          const existingIds = new Set(filtered.map((t) => String(t.id).toLowerCase()));
          for (const d of defaults) {
            if (!existingIds.has(d.id)) filtered.push(d);
          }
          filtered = filtered
            .sort((a, b) => allowedSymbols.indexOf(a.symbol.toUpperCase()) - allowedSymbols.indexOf(b.symbol.toUpperCase()))
            .filter((t, idx, arr) => arr.findIndex((x) => String(x.id).toLowerCase() === String(t.id).toLowerCase()) === idx)
            .filter((t) => allowedIds.includes(String(t.id).toLowerCase()))
            .slice(0, 3);
          setTokens(filtered);
        }
      } catch {}
      try {
        const saved = await AsyncStorage.getItem('selected_token_ids');
        const map: Record<string, boolean> = {};
        if (saved) {
          const ids: string[] = JSON.parse(saved);
          const toCanonical = (v: string) => {
            const s = String(v).toLowerCase();
            if (s === 'btc' || s === 'bitcoin') return 'btc';
            if (s === 'eth' || s === 'ethereum') return 'eth';
            if (s === 'sol' || s === 'solana') return 'sol';
            return s;
          };
          ids.forEach((id) => {
            map[id] = true;
            map[toCanonical(id)] = true; // mark canonical as enabled too
          });
        }
        setEnabled(map);
      } catch {}
    });
    return unsubscribe;
  }, [navigation]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
    title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: theme.colors.text },
    back: { padding: 8 },
    searchWrap: { margin: 16, backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
    input: { flex: 1, paddingVertical: 10, color: theme.colors.text },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    icon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    midCol: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    symbol: { color: theme.colors.text, fontWeight: '700' },
    tag: { marginLeft: 8, fontSize: 10, color: theme.colors.textSecondary, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    price: { color: theme.colors.textSecondary, marginRight: 10 },
    pct: { color: theme.colors.success },
    toggle: { marginLeft: 16 },
  });

  const filtered = tokens
    .filter((t) => ['bitcoin','ethereum','solana'].includes(String(t.id).toLowerCase()))
    .filter(t => `${t.symbol} ${t.name}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Token</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.searchWrap}>
        <Icon name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Search" placeholderTextColor={theme.colors.textSecondary} value={query} onChangeText={setQuery} />
      </View>
      {loading && (
        <View style={{ paddingTop: 40 }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      {!loading && error ? (
        <View style={{ alignItems: 'center', paddingTop: 24 }}>
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={async () => {
            try {
              setLoading(true); setError('');
              const tks = await TokenService.fetchTokensCached('ethereum', 200);
              if (!tks.length) setError('Failed to load tokens. Please retry.');
              setTokens(tks);
            } finally { setLoading(false); }
          }} style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}>
            <Text style={{ color: theme.colors.white }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {!loading && !error && (
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.iconUrl ? (
              <Image source={{ uri: item.iconUrl }} style={[styles.icon, { borderRadius: 14 }]} />
            ) : (
              <View style={[styles.icon, { backgroundColor: item.color + '33' }]}>
                <Text style={{ color: item.color, fontWeight: '800' }}>{item.symbol.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.midCol}>
              <View style={styles.nameRow}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.tag}>{item.name}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{item.priceUSDT ? formatPrice(item.priceUSDT) : '--'}</Text>
                <Text style={[styles.pct, { color: (item.changePct24h || 0) >= 0 ? theme.colors.success : theme.colors.error }]}>
                  {item.changePct24h ? `${item.changePct24h > 0 ? '+' : ''}${item.changePct24h}%` : '--'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.toggle} onPress={async () => {
              const toCanonical = (sym: string) => {
                const s = String(sym).toUpperCase();
                if (s === 'BTC') return 'btc';
                if (s === 'ETH') return 'eth';
                if (s === 'SOL') return 'sol';
                return s.toLowerCase();
              };
              const canonicalId = toCanonical(item.symbol);
              const isOn = !!(enabled[item.id] || enabled[canonicalId] || enabled[item.symbol.toUpperCase()]);
              const next = !isOn;
              let selectedIds: string[] = [];
              try {
                const saved = await AsyncStorage.getItem('selected_token_ids');
                selectedIds = saved ? JSON.parse(saved) : [];
              } catch {}
              if (next) {
                // add canonical id only
                selectedIds = Array.from(new Set(selectedIds.map(String)));
                if (!selectedIds.includes(canonicalId)) selectedIds.push(canonicalId);
              } else {
                // remove any variant of this token id
                const variants = new Set([
                  item.id,
                  canonicalId,
                  String(item.symbol).toLowerCase(),
                  String(item.symbol).toUpperCase(),
                  item.symbol === 'BTC' ? 'bitcoin' : item.symbol === 'ETH' ? 'ethereum' : item.symbol === 'SOL' ? 'solana' : '',
                ].filter(Boolean));
                selectedIds = selectedIds.filter((id) => !variants.has(String(id)));
              }
              await AsyncStorage.setItem('selected_token_ids', JSON.stringify(selectedIds));

              // Also persist a snapshot of the visible tokens for consistent pricing on dashboard
              try {
                const selectedSet = new Set(selectedIds);
                const snapshot = filtered.filter(t => selectedSet.has(toCanonical(t.symbol)));
                if (snapshot.length > 0) {
                  await AsyncStorage.setItem('selectedTokens', JSON.stringify(snapshot));
                } else {
                  await AsyncStorage.removeItem('selectedTokens');
                }
              } catch {}

              const map: Record<string, boolean> = {};
              selectedIds.forEach((id) => { map[id] = true; map[toCanonical(id)] = true; });
              setEnabled(map);
            }}>
              {(() => {
                const toCanonical = (sym: string) => {
                  const s = String(sym).toUpperCase();
                  if (s === 'BTC') return 'btc';
                  if (s === 'ETH') return 'eth';
                  if (s === 'SOL') return 'sol';
                  return s.toLowerCase();
                };
                const canonicalId = toCanonical(item.symbol);
                const on = !!(enabled[item.id] || enabled[canonicalId] || enabled[item.symbol.toUpperCase()]);
                return (
                  <Icon name={on ? 'toggle-on' : 'toggle-off'} size={40} color={on ? theme.colors.accent : theme.colors.border} />
                );
              })()}
            </TouchableOpacity>
          </View>
        )}
      />)}
    </SafeAreaView>
  );
};


