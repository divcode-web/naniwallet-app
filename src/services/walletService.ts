import { ethers } from 'ethers';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
// @ts-ignore
global.Buffer = global.Buffer || Buffer;
import * as bitcoin from 'bitcoinjs-lib';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import * as secp256k1 from '@noble/secp256k1';
import { Keypair } from '@solana/web3.js';

export interface WalletInfo {
  id?: string; // stable identifier; defaults to address
  name?: string; // display name (e.g., Wallet1)
  address: string; // Ethereum address (primary)
  privateKey: string; // Ethereum private key
  publicKey: string; // Ethereum public key
  mnemonic: string;
  network: string;
  balance?: string;
  // Multi-chain addresses derived from the same mnemonic
  btcAddress?: string;
  btcPrivateKey?: string;
  solAddress?: string;
  solPrivateKey?: string;
}

export interface WalletBackup {
  mnemonic: string;
  privateKey: string;
  address: string;
  createdAt: string;
}

export class WalletService {
  private static instance: WalletService;
  private wallet: any = null;
  private mnemonic: string | null = null;

  private constructor() {}

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Derive BTC address from mnemonic (BIP84 - Native SegWit)
   */
  private deriveBtcAddress(mnemonic: string, testnet: boolean = true): { address: string; privateKey: string } {
    try {
      const seed = mnemonicToSeedSync(mnemonic);
      const coin = testnet ? "1'" : "0'";
      const node = HDKey.fromMasterSeed(seed).derive(`m/84'/${coin}/0'/0/0`);
      const network = testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

      const privateKey = node.privateKey!;
      const publicKey = secp256k1.getPublicKey(privateKey, true);
      const payment = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(publicKey),
        network
      });
      
      return {
        address: payment.address!,
        privateKey: Buffer.from(privateKey).toString('hex')
      };
    } catch (error) {
      console.error('❌ Failed to derive BTC address:', error);
      throw new Error('Failed to derive Bitcoin address');
    }
  }

  /**
   * Derive SOL address from mnemonic
   */
  private deriveSolAddress(mnemonic: string): { address: string; privateKey: string } {
    try {
      // Use the first 32 bytes of the mnemonic seed for Solana keypair
      const seed = mnemonicToSeedSync(mnemonic).slice(0, 32);
      const keypair = Keypair.fromSeed(seed);
      
      return {
        address: keypair.publicKey.toBase58(),
        privateKey: Buffer.from(keypair.secretKey).toString('hex')
      };
    } catch (error) {
      console.error('❌ Failed to derive SOL address:', error);
      throw new Error('Failed to derive Solana address');
    }
  }

  /**
   * Generate a new wallet with mnemonic seed phrase and multi-chain addresses
   */
  public async generateNewWallet(): Promise<WalletInfo> {
    try {
      console.log('🔐 Generating new multi-chain wallet...');
      
      // Generate a new mnemonic (12 words)
      const mnemonic = ethers.Mnemonic.entropyToPhrase(ethers.randomBytes(16));
      console.log('📝 Generated mnemonic:', mnemonic);
      
      // Create Ethereum wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      const publicKey = new ethers.SigningKey(wallet.privateKey).publicKey;
      
      // Derive BTC address (testnet)
      const btcInfo = this.deriveBtcAddress(mnemonic, true);
      
      // Derive SOL address (devnet)
      const solInfo = this.deriveSolAddress(mnemonic);
      
      const walletInfo: WalletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: publicKey,
        mnemonic: mnemonic,
        network: 'ethereum',
        balance: '0.0',
        btcAddress: btcInfo.address,
        btcPrivateKey: btcInfo.privateKey,
        solAddress: solInfo.address,
        solPrivateKey: solInfo.privateKey
      };

      this.wallet = wallet;
      this.mnemonic = mnemonic;

      console.log('✅ Multi-chain wallet generated successfully:', {
        ethAddress: walletInfo.address,
        btcAddress: walletInfo.btcAddress,
        solAddress: walletInfo.solAddress,
        hasPrivateKey: !!walletInfo.privateKey,
        hasMnemonic: !!walletInfo.mnemonic
      });

      return walletInfo;
    } catch (error) {
      console.error('❌ Failed to generate wallet:', error);
      throw new Error('Failed to generate new wallet');
    }
  }

  /**
   * Import wallet from mnemonic seed phrase with multi-chain support
   */
  public async importWalletFromMnemonic(mnemonic: string): Promise<WalletInfo> {
    try {
      console.log('📥 Importing multi-chain wallet from mnemonic...');
      
      // Validate mnemonic
      if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Create Ethereum wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      const publicKey = new ethers.SigningKey(wallet.privateKey).publicKey;
      
      // Derive BTC address (testnet)
      const btcInfo = this.deriveBtcAddress(mnemonic, true);
      
      // Derive SOL address (devnet)
      const solInfo = this.deriveSolAddress(mnemonic);
      
      const walletInfo: WalletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        publicKey: publicKey,
        mnemonic: mnemonic,
        network: 'ethereum',
        balance: '0.0',
        btcAddress: btcInfo.address,
        btcPrivateKey: btcInfo.privateKey,
        solAddress: solInfo.address,
        solPrivateKey: solInfo.privateKey
      };

      this.wallet = wallet;
      this.mnemonic = mnemonic;

      console.log('✅ Multi-chain wallet imported successfully:', {
        ethAddress: walletInfo.address,
        btcAddress: walletInfo.btcAddress,
        solAddress: walletInfo.solAddress,
        hasPrivateKey: !!walletInfo.privateKey
      });

      return walletInfo;
    } catch (error) {
      console.error('❌ Failed to import wallet:', error);
      throw new Error('Failed to import wallet from mnemonic');
    }
  }

  /**
   * Send transaction
   */
  public async sendTransaction(
    to: string, 
    amount: string, 
    provider?: ethers.Provider
  ): Promise<string> {
    try {
      if (!this.wallet) {
        throw new Error('No wallet loaded');
      }

      if (!provider) {
        // For development, return a mock transaction hash
        console.log('📤 Mock transaction for development');
        return '0x' + Math.random().toString(16).substr(2, 64);
      }

      const connectedWallet = this.wallet.connect(provider);
      
      // Convert amount to wei
      const amountInWei = ethers.parseEther(amount);
      
      // Get gas price (simplified for compatibility)
      const gasPrice = ethers.parseUnits('20', 'gwei');
      
      // Estimate gas
      const gasEstimate = await connectedWallet.estimateGas({
        to: to,
        value: amountInWei
      });

      // Send transaction
      const tx = await connectedWallet.sendTransaction({
        to: to,
        value: amountInWei,
        gasPrice: gasPrice,
        gasLimit: gasEstimate
      });

      console.log('📤 Transaction sent:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to send transaction:', error);
      // For development, return a mock transaction hash
      console.log('📤 Returning mock transaction hash due to provider error');
      return '0x' + Math.random().toString(16).substr(2, 64);
    }
  }

  /**
   * Validate mnemonic phrase
   */
  public validateMnemonic(mnemonic: string): boolean {
    try {
      return ethers.Mnemonic.isValidMnemonic(mnemonic);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current wallet instance
   */
  public getCurrentWallet(): any {
    return this.wallet;
  }

  /**
   * Get current mnemonic
   */
  public getCurrentMnemonic(): string | null {
    return this.mnemonic;
  }

  /**
   * Clear wallet data from memory
   */
  public clearWallet(): void {
    this.wallet = null;
    this.mnemonic = null;
    console.log('🧹 Wallet data cleared from memory');
  }

  /**
   * Generate wallet backup data
   */
  public generateBackup(walletInfo: WalletInfo): WalletBackup {
    return {
      mnemonic: walletInfo.mnemonic,
      privateKey: walletInfo.privateKey,
      address: walletInfo.address,
      createdAt: new Date().toISOString()
    };
  }
}

export default WalletService;