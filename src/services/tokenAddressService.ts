import { NetworkToken } from './tokenService';
import WalletService from './walletService';
import { Buffer } from 'buffer';
// Ensure Buffer exists before any crypto libs load
// eslint-disable-next-line no-undef
// @ts-ignore
global.Buffer = global.Buffer || Buffer;
import * as bitcoin from 'bitcoinjs-lib';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import * as secp256k1 from '@noble/secp256k1';
import { Wallet } from 'ethers';
import { Keypair } from '@solana/web3.js';

export interface TokenAddressInfo {
  address: string;
  network: string;
  networkId: string;
  isNative: boolean;
  contractAddress?: string;
}

export default class TokenAddressService {
  private static instance: TokenAddressService;
  private cache: Map<string, { info: TokenAddressInfo; ts: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): TokenAddressService {
    if (!TokenAddressService.instance) {
      TokenAddressService.instance = new TokenAddressService();
    }
    return TokenAddressService.instance;
  }

  async getTokenAddressInfo(token: NetworkToken, mnemonic: string) {
    try {
      const symbol = token.symbol.toUpperCase();
      const cacheKey = `${symbol}:${mnemonic || ''}`;

      // Serve from cache if fresh
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
        return cached.info;
      }

      let info: TokenAddressInfo;

      if (symbol === 'BTC') {
        const derived = this.tryDeriveBtcP2WpkhAddress(true, mnemonic);
        info = {
          address: derived ?? '',
          network: 'Bitcoin',
          networkId: 'bitcoin',
          isNative: true
        };
      } else if (symbol === 'ETH') {
        const derived = this.tryDeriveEthAddress(mnemonic);
        info = {
          address: derived ?? '',
          network: 'Ethereum Sepolia Testnet',
          networkId: 'ethereum',
          isNative: true
        };
      } else if(symbol === 'SOL') {
        const derived = this.tryDeriveSolanaAddress(mnemonic);
        info = {
          address: derived ?? '',
          network: 'Solana',
          networkId: 'solana',
          isNative: true
        };
      } else {
        info = {
          address: '',
          network: '',
          networkId: '',
          isNative: true
        };
      }

      // Cache the result
      this.cache.set(cacheKey, { info, ts: Date.now() });
      return info;
    } catch (error) {
      console.error('Error fetching token address info:', error);
      // Return fallback address info
      return {
        address: '',
        network: '',
        networkId: '',
        isNative: true
      };
    }
  }
  private tryDeriveBtcP2WpkhAddress(testnet: boolean, mnemonic: string): string | null {
    try {
      if (!mnemonic) return null;

      const seed = mnemonicToSeedSync(mnemonic);
      const { address } = this.btcP2WPKHFromSeed(seed, testnet);
      return address || null;
    } catch (error) {
      console.log('BTC derivation failed, using placeholder:', error);
      return null;
    }
  }

  private tryDeriveSolanaAddress(mnemonic: string): string | null {
    try {
      if (!mnemonic) return null;

      // Use the first 32 bytes of the mnemonic seed for Solana keypair
      const seed = mnemonicToSeedSync(mnemonic).slice(0, 32);
      const kp = Keypair.fromSeed(seed);
      return kp.publicKey.toBase58();
    } catch (error) {
      console.log('SOL derivation failed:', error);
      return null;
    }
  }

  private tryDeriveEthAddress(mnemonic: string): string | null {
    try {
      if (!mnemonic) return null;
      
      // Derive Ethereum address from mnemonic
      const wallet = Wallet.fromPhrase(mnemonic);
      return wallet.address;
    } catch (error) {
      console.log('ETH derivation failed:', error);
      return null;
    }
  }

  private btcP2WPKHFromSeed(seed: Uint8Array, testnet: boolean = false): { privateKey: Uint8Array; publicKey: Buffer; address: string } {
    try {
      const coin = testnet ? "1'" : "0'";
      const node = HDKey.fromMasterSeed(seed).derive(`m/84'/${coin}/0'/0/0`);
      const network = testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

      const privateKey = node.privateKey!;
      const publicKey = secp256k1.getPublicKey(privateKey, true);
      const payment = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(publicKey), network });
      return { privateKey, publicKey: Buffer.from(publicKey), address: payment.address! };
    } catch (error) {
      console.error('Bitcoin derivation error:', error);
      throw new Error('Failed to derive Bitcoin address: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}
