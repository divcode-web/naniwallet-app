import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Switch, BackHandler } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { useCurrency } from '../../context/CurrencyContext';
import { t } from '../../i18n';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props { navigation: any }

export const PreferencesScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, setThemeMode, changePrimaryColor } = useTheme();
  const { locale } = useLocale();
  const { currency, setCurrency, currencyInfo } = useCurrency();
  const languageLabel = useMemo(() => {
    switch (locale) {
      case 'en':
        return 'English (US)';
      case 'so':
        return 'Somali';
      case 'ar':
        return 'العربية';
      case 'sw':
        return 'Kiswahili';
      default:
        return 'English (US)';
    }
  }, [locale]);
  const [hideBalances, setHideBalances] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [colorSheetOpen, setColorSheetOpen] = useState(false);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'Auto' | 'Light' | 'Dark'>('Auto');
  const [currentPrimaryColor, setCurrentPrimaryColor] = useState<string>('#2E7D32');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('pref_hide_balances');
      setHideBalances(saved === 'true');
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme === 'light') setCurrentTheme('Light');
      else if (savedTheme === 'dark') setCurrentTheme('Dark');
      else setCurrentTheme('Auto');
      
      const savedPrimaryColor = await AsyncStorage.getItem('primaryColor');
      if (savedPrimaryColor) {
        setCurrentPrimaryColor(savedPrimaryColor);
      }
    })();
  }, []);

  const persistHideBalances = async (value: boolean) => {
    setHideBalances(value);
    await AsyncStorage.setItem('pref_hide_balances', value ? 'true' : 'false');
  };

  // Close sheets on hardware back instead of propagating to Home's handler
  useEffect(() => {
    if (!themeSheetOpen && !colorSheetOpen && !currencySheetOpen) return;
    const onBack = () => {
      if (themeSheetOpen) setThemeSheetOpen(false);
      if (colorSheetOpen) setColorSheetOpen(false);
      if (currencySheetOpen) setCurrencySheetOpen(false);
      return true; // consume back press
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [themeSheetOpen, colorSheetOpen, currencySheetOpen]);
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
    title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: theme.colors.text },
    back: { padding: 8 },
    content: { padding: 20 },
    text: { color: theme.colors.text },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('preferences', locale)}</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.content}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }} onPress={() => setCurrencySheetOpen(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="attach-money" size={22} color={theme.colors.text} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.colors.text }}>{t('currency', locale)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, marginRight: 6 }}>{currencyInfo.symbol} {currencyInfo.code}</Text>
              <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }} onPress={() => navigation.navigate('Language')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="language" size={22} color={theme.colors.text} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.colors.text }}>{t('language', locale)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, marginRight: 6 }}>{languageLabel}</Text>
              <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }} onPress={() => setThemeSheetOpen(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="brightness-6" size={22} color={theme.colors.text} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.colors.text }}>{t('theme', locale)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, marginRight: 6 }}>{currentTheme}</Text>
              <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }} onPress={() => setColorSheetOpen(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="palette" size={22} color={theme.colors.text} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.colors.text }}>{t('primary_color', locale)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentPrimaryColor, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border }} />
              <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="format-list-numbered" size={22} color={theme.colors.text} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.colors.text }}>{t('number_format', locale)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.textSecondary, marginRight: 6 }}>1,234,567.89</Text>
              <Icon name="chevron-right" size={22} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="visibility-off" size={22} color={theme.colors.text} style={{ marginRight: 12 }} />
              <Text style={{ color: theme.colors.text }}>{t('hide_balances', locale)}</Text>
            </View>
            <Switch
              value={hideBalances}
              onValueChange={persistHideBalances}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor={hideBalances ? theme.colors.white : theme.colors.surface}
            />
          </View>
        </View>
      </View>

      {themeSheetOpen && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 44, height: 3, backgroundColor: theme.colors.border, borderRadius: 2 }} />
          </View>
          <Text style={{ textAlign: 'center', paddingVertical: 12, color: theme.colors.text, fontWeight: '600' }}>Theme</Text>
          {([
            { label: 'Light', icon: 'wb-sunny', value: 'light' },
            { label: 'Dark', icon: 'nightlight', value: 'dark' },
            { label: 'Auto', icon: 'brightness-6', value: 'auto' },
          ] as const).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}
              onPress={async () => {
                setThemeMode(opt.value as any);
                await AsyncStorage.setItem('themeMode', opt.value);
                setCurrentTheme(opt.label as any);
                setThemeSheetOpen(false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name={opt.icon} size={22} color={theme.colors.text} style={{ marginRight: 12 }} />
                <Text style={{ color: theme.colors.text }}>{opt.label}</Text>
              </View>
              {currentTheme.toLowerCase() === opt.value && (
                <Icon name="check" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
          <View style={{ height: 12 }} />
        </View>
      )}

      {colorSheetOpen && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: theme.colors.border, maxHeight: '80%' }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 44, height: 3, backgroundColor: theme.colors.border, borderRadius: 2 }} />
          </View>
          <Text style={{ textAlign: 'center', paddingVertical: 12, color: theme.colors.text, fontWeight: '600' }}>{t('primary_color', locale)}</Text>
          
          {/* Color Grid */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 12 }}>
              {[
                { name: 'Islamic Green', color: '#2E7D32' },
                { name: 'Ocean Blue', color: '#1976D2' },
                { name: 'Royal Purple', color: '#7B1FA2' },
                { name: 'Sunset Orange', color: '#F57C00' },
                { name: 'Cherry Red', color: '#D32F2F' },
                { name: 'Teal Blue', color: '#00796B' },
                { name: 'Deep Indigo', color: '#303F9F' },
                { name: 'Warm Brown', color: '#5D4037' },
                { name: 'Forest Green', color: '#388E3C' },
                { name: 'Crimson', color: '#C2185B' },
                { name: 'Navy Blue', color: '#1565C0' },
                { name: 'Dark Gray', color: '#424242' },
              ].map((colorOption) => (
                <TouchableOpacity
                  key={colorOption.color}
                  style={{
                    width: 60,
                    height: 60,
                    marginBottom: 12,
                    borderRadius: 12,
                    backgroundColor: colorOption.color,
                    borderWidth: currentPrimaryColor === colorOption.color ? 3 : 1,
                    borderColor: currentPrimaryColor === colorOption.color ? theme.colors.text : theme.colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: theme.colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  onPress={async () => {
                    changePrimaryColor(colorOption.color);
                    setCurrentPrimaryColor(colorOption.color);
                    setColorSheetOpen(false);
                  }}
                >
                  {currentPrimaryColor === colorOption.color && (
                    <Icon name="check" size={20} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ height: 20 }} />
        </View>
      )}

      {currencySheetOpen && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 44, height: 3, backgroundColor: theme.colors.border, borderRadius: 2 }} />
          </View>
          <Text style={{ textAlign: 'center', paddingVertical: 12, color: theme.colors.text, fontWeight: '600' }}>{t('currency', locale)}</Text>
          {[
            { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
            { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
          ].map((currencyOption) => (
            <TouchableOpacity
              key={currencyOption.code}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}
              onPress={() => {
                setCurrency(currencyOption.code as any);
                setCurrencySheetOpen(false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>{currencyOption.flag}</Text>
                <View>
                  <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{currencyOption.name}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{currencyOption.symbol} {currencyOption.code}</Text>
                </View>
              </View>
              {currency === currencyOption.code && (
                <Icon name="check" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
          <View style={{ height: 12 }} />
        </View>
      )}
    </SafeAreaView>
  );
};


