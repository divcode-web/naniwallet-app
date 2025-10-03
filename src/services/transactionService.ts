import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';
import { Connection, Transaction, SystemProgram, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import * as secp256k1 from '@noble/secp256k1';
import ECPairFactory from 'ecpair';
import * as ecc from '@bitcoinerlab/secp256k1';

const ECPair = ECPairFactory(ecc);

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class TransactionService {
  private static instance: TransactionService;

  // Ethereum Sepolia testnet RPC
  private readonly ETH_SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
  
  // Solana devnet RPC
  private readonly SOL_DEVNET_RPC = 'https://api.devnet.solana.com';

  static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  /**
   * Fetch with timeout utility
   */
  private async fetchWithTimeout(url: string, options?: any, timeoutMs: number = 12000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...options, signal: controller.signal });
      return resp;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Sleep utility
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
  }

  /**
   * Fetch UTXOs with fallback providers
   */
  private async fetchUTXOs(address: string): Promise<any[]> {
    // Try BlockCypher first
    try {
      console.log('🔍 Fetching UTXOs from BlockCypher...');
      const response = await this.fetchWithTimeout(
        `https://api.blockcypher.com/v1/btc/test3/addrs/${address}?unspentOnly=true`,
        undefined,
        8000
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('⚠️ BlockCypher rate limited, trying fallback...');
          await this.sleep(1000);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const utxos = data.txrefs || [];
      console.log(`✅ Found ${utxos.length} UTXOs from BlockCypher`);
      return utxos;
    } catch (error: any) {
      console.warn('⚠️ BlockCypher failed:', error.message);
      
      // Fallback to Blockstream
      try {
        console.log('🔍 Trying Blockstream API...');
        const response = await this.fetchWithTimeout(
          `https://blockstream.info/testnet/api/address/${address}/utxo`,
          undefined,
          12000
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const utxos = await response.json();
        // Convert Blockstream format to BlockCypher-like format
        const converted = utxos.map((utxo: any) => ({
          tx_hash: utxo.txid,
          tx_output_n: utxo.vout,
          value: utxo.value,
        }));
        console.log(`✅ Found ${converted.length} UTXOs from Blockstream`);
        return converted;
      } catch (fallbackError: any) {
        console.error('❌ All UTXO providers failed:', fallbackError.message);
        throw new Error('Failed to fetch UTXOs from all providers. Please check your internet connection and try again.');
      }
    }
  }

  /**
   * Send ETH transaction on Sepolia testnet
   */
  async sendEthTransaction(
    mnemonic: string,
    toAddress: string,
    amount: string
  ): Promise<TransactionResult> {
    try {
      console.log('📤 Sending ETH transaction...');
      console.log('To:', toAddress);
      console.log('Amount:', amount, 'ETH');

      // Create provider with timeout
      const fetchReq = new ethers.FetchRequest(this.ETH_SEPOLIA_RPC);
      (fetchReq as any).timeout = 15000; // 15 second timeout
      const provider = new ethers.JsonRpcProvider(fetchReq);
      
      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      const connectedWallet = wallet.connect(provider);

      console.log('From address:', wallet.address);

      // Verify network
      console.log('🔍 Verifying network...');
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        throw new Error(`Wrong network: ${network.chainId}. Expected Sepolia (11155111)`);
      }
      console.log('✅ Connected to Sepolia');

      // Convert amount to wei
      const amountInWei = ethers.parseEther(amount);
      console.log('Amount in wei:', amountInWei.toString());

      // Get current gas price
      console.log('🔍 Fetching gas price...');
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
      console.log('Gas price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');

      // Estimate gas
      console.log('🔍 Estimating gas...');
      const gasLimit = await connectedWallet.estimateGas({
        to: toAddress,
        value: amountInWei,
      });
      console.log('Gas limit:', gasLimit.toString());

      // Send transaction
      console.log('📡 Broadcasting ETH transaction...');
      const tx = await connectedWallet.sendTransaction({
        to: toAddress,
        value: amountInWei,
        gasPrice: gasPrice,
        gasLimit: gasLimit,
      });

      console.log('✅ ETH transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation (this may take 15-30 seconds)...');

      // Wait for confirmation with timeout
      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
        )
      ]) as any;
      
      console.log('✅ ETH transaction confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        txHash: tx.hash,
      };
    } catch (error: any) {
      console.error('❌ ETH transaction failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send ETH transaction',
      };
    }
  }

  /**
   * Send BTC transaction on testnet
   */
  async sendBtcTransaction(
    mnemonic: string,
    toAddress: string,
    amount: string
  ): Promise<TransactionResult> {
    try {
      console.log('📤 Sending BTC transaction...');
      console.log('To:', toAddress);
      console.log('Amount:', amount, 'BTC');

      // Derive BTC keys
      const seed = mnemonicToSeedSync(mnemonic);
      const node = HDKey.fromMasterSeed(seed).derive(`m/84'/1'/0'/0/0`);
      const network = bitcoin.networks.testnet;

      const privateKey = node.privateKey!;
      const privateKeyBuffer = Buffer.from(privateKey);
      
      // Create ECPair with the network
      const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, { network });
      
      // Create payment address from ECPair (this ensures pubkey compatibility)
      const payment = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(keyPair.publicKey),
        network
      });
      const fromAddress = payment.address!;

      console.log('From address:', fromAddress);

      // Validate recipient address
      try {
        bitcoin.address.toOutputScript(toAddress, network);
        console.log('✅ Recipient address validated:', toAddress);
      } catch (error) {
        throw new Error(`Invalid recipient address: ${toAddress}. Please check the address and try again.`);
      }

      // Convert amount to satoshis
      const amountInSatoshis = Math.floor(parseFloat(amount) * 100000000);
      console.log('Amount to send:', amountInSatoshis, 'satoshis');

      // Fetch UTXOs with fallback support
      const utxos = await this.fetchUTXOs(fromAddress);

      if (utxos.length === 0) {
        throw new Error('No UTXOs available. Please ensure your wallet has funds.');
      }

      // Calculate total available balance
      const totalAvailable = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
      console.log('Total available balance:', totalAvailable, 'satoshis (', (totalAvailable / 100000000).toFixed(8), 'BTC)');

      // Estimate fee: 148 bytes per input + 34 bytes per output + 10 bytes overhead
      // SegWit is cheaper, roughly 110 vbytes per input
      const estimatedSize = (utxos.length * 110) + (2 * 34) + 10; // Assume 2 outputs (recipient + change)
      const feeRate = 2; // 2 sat/vbyte for testnet
      const estimatedFee = Math.ceil(estimatedSize * feeRate);
      const minFee = 300; // Minimum fee to ensure transaction is relayed
      const fee = Math.max(estimatedFee, minFee);
      
      console.log('Estimated fee:', fee, 'satoshis');
      console.log('Total needed:', amountInSatoshis + fee, 'satoshis');

      // Check if we have enough balance
      if (totalAvailable < amountInSatoshis + fee) {
        const neededBTC = ((amountInSatoshis + fee) / 100000000).toFixed(8);
        const availableBTC = (totalAvailable / 100000000).toFixed(8);
        const shortfallBTC = (((amountInSatoshis + fee) - totalAvailable) / 100000000).toFixed(8);
        throw new Error(
          `Insufficient balance.\n` +
          `Available: ${availableBTC} BTC\n` +
          `Needed: ${neededBTC} BTC (${amount} BTC + ${(fee / 100000000).toFixed(8)} BTC fee)\n` +
          `Shortfall: ${shortfallBTC} BTC`
        );
      }

      // Create transaction
      const psbt = new bitcoin.Psbt({ network });

      // Create a redeemScript for signing
      const p2wpkh = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(keyPair.publicKey),
        network
      });

      // Add all UTXOs as inputs
      let totalInput = 0;
      for (const utxo of utxos) {
        totalInput += utxo.value;
        
        // For SegWit (p2wpkh), we only need witnessUtxo
        psbt.addInput({
          hash: utxo.tx_hash,
          index: utxo.tx_output_n,
          witnessUtxo: {
            script: p2wpkh.output!,
            value: utxo.value,
          },
        });
      }

      console.log('Total input collected:', totalInput, 'satoshis');

      // Add output to recipient
      psbt.addOutput({
        address: toAddress,
        value: amountInSatoshis,
      });

      // Add change output if significant
      const change = totalInput - amountInSatoshis - fee;
      console.log('Change amount:', change, 'satoshis');
      
      if (change > 546) { // Dust limit
        psbt.addOutput({
          address: fromAddress,
          value: change,
        });
        console.log('✅ Added change output');
      } else if (change > 0) {
        console.log('⚠️ Change too small (dust), adding to fee');
      }

      // Create a signer object with proper Buffer handling for React Native
      const signer = {
        publicKey: Buffer.from(keyPair.publicKey),
        sign: (hash: Buffer) => {
          const signature = keyPair.sign(hash);
          return Buffer.from(signature);
        },
      };

      // Sign all inputs using our custom signer
      console.log('Signing', psbt.inputCount, 'inputs...');
      for (let i = 0; i < psbt.inputCount; i++) {
        try {
          psbt.signInput(i, signer as any);
          console.log(`✅ Signed input ${i + 1}/${psbt.inputCount}`);
        } catch (signError: any) {
          console.error(`❌ Failed to sign input ${i}:`, signError.message);
          throw new Error(`Failed to sign transaction input ${i}: ${signError.message}`);
        }
      }

      psbt.finalizeAllInputs();
      const txHex = psbt.extractTransaction().toHex();

      // Broadcast transaction with fallback
      console.log('📡 Broadcasting BTC transaction...');
      
      let txHash: string | undefined;
      
      // Try BlockCypher first
      try {
        const broadcastResponse = await this.fetchWithTimeout(
          'https://api.blockcypher.com/v1/btc/test3/txs/push',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tx: txHex }),
          },
          15000
        );

        if (broadcastResponse.ok) {
          const result = await broadcastResponse.json();
          txHash = result.tx?.hash || result.hash;
          console.log('✅ BTC transaction broadcast via BlockCypher:', txHash);
        } else {
          const errorText = await broadcastResponse.text();
          console.warn('⚠️ BlockCypher broadcast failed:', errorText);
          throw new Error('BlockCypher failed');
        }
      } catch (primaryError: any) {
        console.warn('⚠️ Primary broadcaster failed, trying Blockstream...');
        
        // Fallback to Blockstream
        try {
          const fallbackResponse = await this.fetchWithTimeout(
            'https://blockstream.info/testnet/api/tx',
            {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: txHex,
            },
            15000
          );

          if (fallbackResponse.ok) {
            txHash = await fallbackResponse.text();
            console.log('✅ BTC transaction broadcast via Blockstream:', txHash);
          } else {
            const errorText = await fallbackResponse.text();
            throw new Error(`Blockstream broadcast failed: ${errorText}`);
          }
        } catch (fallbackError: any) {
          throw new Error(`Failed to broadcast transaction on all providers. ${fallbackError.message}`);
        }
      }

      if (!txHash) {
        throw new Error('Transaction broadcast failed - no transaction hash received');
      }

      return {
        success: true,
        txHash: txHash,
      };
    } catch (error: any) {
      console.error('❌ BTC transaction failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send BTC transaction',
      };
    }
  }

  /**
   * Send SOL transaction on devnet with fallback RPCs
   */
  async sendSolTransaction(
    mnemonic: string,
    toAddress: string,
    amount: string
  ): Promise<TransactionResult> {
    const RPC_ENDPOINTS = [
      'https://api.devnet.solana.com',
      'https://devnet.helius-rpc.com',
      'https://rpc-devnet.helius.xyz',
    ];

    let lastError: any;

    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
      const rpcUrl = RPC_ENDPOINTS[i];
      try {
        console.log(`📤 Sending SOL transaction via ${rpcUrl}...`);
        console.log('To:', toAddress);
        console.log('Amount:', amount, 'SOL');

        // Create connection with timeout
        const connection = new Connection(rpcUrl, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000, // 60 second timeout
        });

        // Derive Solana keypair from mnemonic
        const seed = mnemonicToSeedSync(mnemonic).slice(0, 32);
        const keypair = Keypair.fromSeed(seed);
        const fromPubkey = keypair.publicKey;

        console.log('From address:', fromPubkey.toBase58());

        // Convert amount to lamports (1 SOL = 1e9 lamports)
        const amountInLamports = Math.floor(parseFloat(amount) * 1e9);
        console.log('Amount in lamports:', amountInLamports);

        // Create transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: fromPubkey,
            toPubkey: new PublicKey(toAddress),
            lamports: amountInLamports,
          })
        );

        // Get recent blockhash with timeout
        console.log('🔍 Getting recent blockhash...');
        const { blockhash, lastValidBlockHeight } = await Promise.race([
          connection.getLatestBlockhash('confirmed'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Blockhash fetch timeout')), 10000)
          )
        ]) as any;
        
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        console.log('✅ Blockhash obtained');

        // Sign and send transaction
        console.log('📡 Broadcasting SOL transaction...');
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [keypair],
          {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
          }
        );

        console.log('✅ SOL transaction sent:', signature);

        return {
          success: true,
          txHash: signature,
        };
      } catch (error: any) {
        console.error(`❌ SOL transaction failed on ${rpcUrl}:`, error.message);
        lastError = error;
        
        if (i < RPC_ENDPOINTS.length - 1) {
          console.log(`⚠️ Trying next RPC endpoint...`);
          await this.sleep(1000);
          continue;
        }
      }
    }

    console.error('❌ All SOL RPC endpoints failed');
    return {
      success: false,
      error: lastError?.message || 'Failed to send SOL transaction on all RPC endpoints',
    };
  }

  /**
   * Send transaction based on token symbol
   */
  async sendTransaction(
    tokenSymbol: string,
    mnemonic: string,
    toAddress: string,
    amount: string
  ): Promise<TransactionResult> {
    const symbol = tokenSymbol.toUpperCase();

    switch (symbol) {
      case 'ETH':
        return this.sendEthTransaction(mnemonic, toAddress, amount);
      case 'BTC':
        return this.sendBtcTransaction(mnemonic, toAddress, amount);
      case 'SOL':
        return this.sendSolTransaction(mnemonic, toAddress, amount);
      default:
        return {
          success: false,
          error: `Unsupported token: ${tokenSymbol}`,
        };
    }
  }
}

export default TransactionService;
