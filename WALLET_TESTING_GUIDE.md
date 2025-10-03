# NaniWallet - Multi-Chain Testing Guide

## Overview
This guide provides comprehensive testing procedures for the NaniWallet multi-chain cryptocurrency wallet application. All testing should be conducted on testnet environments.

---

## 🔧 Prerequisites

### Required Setup
1. React Native development environment configured
2. Android emulator or physical device connected
3. Metro bundler running (`npm start`)

### Testnet Networks
- **Ethereum**: Sepolia Testnet (Chain ID: 11155111)
- **Bitcoin**: Bitcoin Testnet 3
- **Solana**: Devnet

---

## 📝 Test Plan

### Phase 1: Wallet Generation & Seedphrase Verification

#### Test 1.1: Create New Wallet
**Objective**: Verify wallet generation creates valid addresses for all chains

**Steps**:
1. Launch app and navigate to WalletSetup screen
2. Click "Create New Wallet"
3. Verify 12-word mnemonic is displayed
4. Copy and save the mnemonic securely
5. Click "I've Backed Up" and proceed to confirmation
6. Enter the saved mnemonic
7. Complete wallet creation

**Expected Results**:
- ✅ 12-word BIP39 mnemonic generated
- ✅ Mnemonic is displayed correctly
- ✅ Wallet created successfully
- ✅ Three addresses generated:
  - Ethereum address (0x... format, 42 chars)
  - Bitcoin address (tb1... format for testnet)
  - Solana address (Base58 format, ~44 chars)

**Test Data Example**:
```
Sample Mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about

Expected Addresses (from this mnemonic):
- ETH: 0x9858EfFD232B4033E47d90003D41EC34EcAEda94
- BTC: tb1q...  (testnet P2WPKH)
- SOL: (Base58 address)
```

#### Test 1.2: Import Existing Wallet
**Objective**: Verify wallet import restores correct addresses

**Steps**:
1. Navigate to WalletSetup screen
2. Click "Import Existing Wallet"
3. Enter a known test mnemonic
4. Complete import process

**Expected Results**:
- ✅ Import succeeds with valid mnemonic
- ✅ Import fails with invalid mnemonic
- ✅ Same mnemonic produces same addresses across imports
- ✅ All three chain addresses match previous generation

#### Test 1.3: Multi-Wallet Creation
**Objective**: Verify system supports multiple wallets

**Steps**:
1. Create first wallet (Wallet1)
2. Navigate to Manage Wallets
3. Create second wallet (Wallet2)
4. Create third wallet (Wallet3)
5. Switch between wallets

**Expected Results**:
- ✅ Can create multiple wallets
- ✅ Each wallet has unique addresses
- ✅ Can switch between wallets
- ✅ Correct addresses displayed for each wallet

---

### Phase 2: Testnet Faucet Compatibility

#### Test 2.1: Ethereum Sepolia Address
**Objective**: Verify ETH address works with Sepolia faucets

**Steps**:
1. Copy your Ethereum address from Receive dialog
2. Visit Sepolia faucets:
   - https://sepolia-faucet.pk910.de/
   - https://sepoliafaucet.com/
   - https://www.infura.io/faucet/sepolia
3. Request testnet ETH
4. Wait for transaction confirmation
5. Check balance in app

**Expected Results**:
- ✅ Address accepted by faucets
- ✅ Transaction appears in blockchain explorer
- ✅ Balance updates in app within 1-2 minutes

**Verification Links**:
- Block Explorer: https://sepolia.etherscan.io/
- Paste your address to verify transactions

#### Test 2.2: Bitcoin Testnet Address
**Objective**: Verify BTC address works with testnet faucets

**Steps**:
1. Copy your Bitcoin address from Receive dialog
2. Visit BTC testnet faucets:
   - https://testnet-faucet.com/btc-testnet/
   - https://coinfaucet.eu/en/btc-testnet/
   - https://bitcointestnet.run/
3. Request testnet BTC
4. Wait for confirmation (may take 10-30 minutes)
5. Check balance in app

**Expected Results**:
- ✅ tb1... address accepted by faucets
- ✅ Transaction appears in blockchain explorer
- ✅ Balance updates in app after confirmations

**Verification Links**:
- Block Explorer: https://blockstream.info/testnet/
- Mempool Explorer: https://mempool.space/testnet/

#### Test 2.3: Solana Devnet Address
**Objective**: Verify SOL address works with devnet faucets

**Steps**:
1. Copy your Solana address from Receive dialog
2. Visit SOL devnet faucets:
   - https://faucet.solana.com/
   - https://solfaucet.com/
3. Request devnet SOL (can request up to 5 SOL)
4. Transaction should confirm instantly
5. Check balance in app

**Expected Results**:
- ✅ Base58 address accepted by faucets
- ✅ Transaction appears immediately in explorer
- ✅ Balance updates in app within seconds

**Verification Links**:
- Block Explorer: https://explorer.solana.com/?cluster=devnet

---

### Phase 3: Balance Display Testing

#### Test 3.1: Real-Time Balance Updates
**Objective**: Verify balances update correctly for all chains

**Steps**:
1. Navigate to Wallet Dashboard
2. Add BTC, ETH, and SOL tokens to dashboard
3. Pull down to refresh
4. Observe balance updates

**Expected Results**:
- ✅ ETH balance shows in Sepolia testnet ETH
- ✅ BTC balance shows in testnet BTC (8 decimal places)
- ✅ SOL balance shows in devnet SOL
- ✅ All balances accurate to blockchain state
- ✅ USD equivalent calculated correctly
- ✅ Refresh updates all balances

#### Test 3.2: Multi-Token Display
**Objective**: Verify proper formatting for different tokens

**Test Cases**:
| Token | Balance | Display Format |
|-------|---------|----------------|
| ETH   | 0.5     | 0.500000 ETH   |
| BTC   | 0.01    | 0.01000000 BTC |
| SOL   | 2.5     | 2.500000 SOL   |

**Expected Results**:
- ✅ Correct decimal precision per token
- ✅ No scientific notation
- ✅ Trailing zeros displayed appropriately

#### Test 3.3: Zero Balance Handling
**Objective**: Verify app handles zero balances correctly

**Steps**:
1. Create new wallet with zero balance
2. Check dashboard display

**Expected Results**:
- ✅ Shows "0" not undefined/null
- ✅ No errors displayed
- ✅ Can still interact with wallet

---

### Phase 4: Send Functionality Testing

#### Test 4.1: Send Ethereum (Sepolia)
**Objective**: Verify ETH sending works correctly

**Prerequisites**: Wallet must have testnet ETH

**Steps**:
1. Navigate to Wallet Dashboard
2. Select ETH token
3. Click "Send"
4. Enter recipient address (use another wallet you control)
5. Enter amount (0.01 ETH)
6. Confirm transaction
7. Wait for confirmation

**Expected Results**:
- ✅ Transaction broadcast successfully
- ✅ Transaction hash returned
- ✅ Balance decreases by sent amount + gas fees
- ✅ Recipient receives ETH
- ✅ Transaction visible on Sepolia explorer

**Test Recipient Address** (for testing):
```
Create a second wallet and use its ETH address, or use:
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

#### Test 4.2: Send Bitcoin (Testnet)
**Objective**: Verify BTC sending works correctly

**Prerequisites**: Wallet must have testnet BTC

**Steps**:
1. Select BTC token
2. Click "Send"
3. Enter recipient address
4. Enter amount (0.001 BTC)
5. Confirm transaction
6. Wait for confirmation

**Expected Results**:
- ✅ Transaction broadcast successfully
- ✅ UTXO management working
- ✅ Change address handled correctly
- ✅ Balance updates after confirmation
- ✅ Transaction visible on testnet explorer

**Note**: Bitcoin transactions may take 10-60 minutes for confirmation

#### Test 4.3: Send Solana (Devnet)
**Objective**: Verify SOL sending works correctly

**Prerequisites**: Wallet must have devnet SOL

**Steps**:
1. Select SOL token
2. Click "Send"
3. Enter recipient address
4. Enter amount (0.1 SOL)
5. Confirm transaction
6. Transaction should confirm almost instantly

**Expected Results**:
- ✅ Transaction broadcast successfully
- ✅ Balance updates immediately
- ✅ Recipient receives SOL within seconds
- ✅ Transaction visible on Solana devnet explorer

#### Test 4.4: Error Handling
**Objective**: Verify proper error handling for send operations

**Test Cases**:

| Scenario | Expected Behavior |
|----------|-------------------|
| Insufficient balance | Error: "Insufficient balance" |
| Invalid address | Error: "Invalid address" |
| Zero amount | Error: "Enter valid amount" |
| Network offline | Error: "Network error" |
| Gas too low (ETH) | Error: "Insufficient gas" |

---

### Phase 5: Receive Functionality Testing

#### Test 5.1: QR Code Generation
**Objective**: Verify QR codes generate correctly

**Steps**:
1. Select token (ETH, BTC, or SOL)
2. Click "Receive"
3. Verify QR code displays
4. Scan QR code with another device

**Expected Results**:
- ✅ QR code displays correctly
- ✅ QR code contains correct address
- ✅ Network label shown correctly
- ✅ Can copy address
- ✅ Can share QR code

#### Test 5.2: Address Formats
**Objective**: Verify correct address format per chain

**Verification**:
| Chain | Address Format | Example |
|-------|----------------|---------|
| ETH   | 0x... (42 chars) | 0x742d35Cc6... |
| BTC   | tb1... (testnet) | tb1qw508d6q... |
| SOL   | Base58 (~44 chars) | 7EqQdEUoD... |

**Expected Results**:
- ✅ Each chain shows correct address format
- ✅ Addresses match wallet's derived addresses
- ✅ QR codes encode correct URI scheme

---

### Phase 6: Top-Up Functionality Testing

#### Test 6.1: Faucet Navigation
**Objective**: Verify top-up screen provides faucet access

**Steps**:
1. Select any token
2. Click "Top Up" or navigate to top-up screen
3. Verify faucet links displayed
4. Click "Open Faucet" button
5. Verify browser opens with correct faucet

**Expected Results**:
- ✅ Correct faucets listed for each token
- ✅ Address pre-copied or easily accessible
- ✅ Faucet links open correctly
- ✅ Network information displayed

#### Test 6.2: Address Copy from Top-Up
**Objective**: Verify easy address copying for faucets

**Steps**:
1. Open top-up screen
2. Click copy address button
3. Paste into faucet website

**Expected Results**:
- ✅ Address copied to clipboard
- ✅ Correct address for selected token
- ✅ Confirmation message shown

---

### Phase 7: Cross-Chain Operations

#### Test 7.1: Chain Switching
**Objective**: Verify smooth switching between chains

**Steps**:
1. View ETH balance
2. Switch to BTC token
3. Switch to SOL token
4. Switch back to ETH
5. Perform operations on each chain

**Expected Results**:
- ✅ Balance updates when switching
- ✅ Correct address shown per chain
- ✅ No data corruption
- ✅ UI updates properly

#### Test 7.2: Concurrent Balance Checks
**Objective**: Verify all chain balances load correctly

**Steps**:
1. Add all three tokens (BTC, ETH, SOL)
2. Refresh dashboard
3. Verify all balances update

**Expected Results**:
- ✅ All balances load simultaneously
- ✅ No race conditions
- ✅ Correct balance for each chain

---

### Phase 8: Navigation Completeness

#### Test 8.1: Full Navigation Flow
**Objective**: Verify all screens accessible

**Navigation Path**:
```
Home → Wallet Dashboard → Select Token → 
  ├─ Send Dialog → Confirm → Success
  ├─ Receive Dialog → QR Code → Close
  └─ Top Up → Faucet List → Open Faucet

Home → Settings →
  ├─ Security → Biometric/PIN
  ├─ Preferences → Theme/Language
  ├─ Manage Wallets → Add/Edit/Remove
  └─ Account Profile
```

**Expected Results**:
- ✅ All screens accessible
- ✅ Back navigation works
- ✅ No dead ends
- ✅ Deep links work

#### Test 8.2: Error Recovery
**Objective**: Verify app handles errors gracefully

**Test Scenarios**:
- Network disconnection during transaction
- App backgrounding during operation
- Low memory situations
- Invalid navigation params

---

## 🧪 Integration Testing Checklist

### Critical Path Testing
- [ ] Create wallet → Receive funds → Send funds → Success
- [ ] Import wallet → Verify addresses → Check balances → Success
- [ ] Multi-wallet: Create 3+ wallets → Switch between them → All work
- [ ] Cross-chain: Get testnet tokens on all chains → Send on all chains → Receive on all chains

### Regression Testing
- [ ] Wallet generation produces consistent addresses
- [ ] Mnemonic import recovers exact same addresses
- [ ] Balance refreshes work reliably
- [ ] Transaction history (if implemented) shows correctly
- [ ] App state persists across restarts

### Performance Testing
- [ ] App launches within 3 seconds
- [ ] Balance updates within 5 seconds
- [ ] Transactions broadcast within 10 seconds
- [ ] QR codes generate instantly
- [ ] No memory leaks during extended use

---

## 📊 Test Results Template

### Test Execution Summary

**Tester**: _____________  
**Date**: _____________  
**Build Version**: _____________  
**Device**: _____________

| Phase | Test Case | Status | Notes |
|-------|-----------|--------|-------|
| 1 | Wallet Generation | ⬜ PASS / ⬜ FAIL | |
| 1 | Wallet Import | ⬜ PASS / ⬜ FAIL | |
| 1 | Multi-Wallet | ⬜ PASS / ⬜ FAIL | |
| 2 | ETH Faucet Compatibility | ⬜ PASS / ⬜ FAIL | |
| 2 | BTC Faucet Compatibility | ⬜ PASS / ⬜ FAIL | |
| 2 | SOL Faucet Compatibility | ⬜ PASS / ⬜ FAIL | |
| 3 | Balance Display ETH | ⬜ PASS / ⬜ FAIL | |
| 3 | Balance Display BTC | ⬜ PASS / ⬜ FAIL | |
| 3 | Balance Display SOL | ⬜ PASS / ⬜ FAIL | |
| 4 | Send ETH | ⬜ PASS / ⬜ FAIL | |
| 4 | Send BTC | ⬜ PASS / ⬜ FAIL | |
| 4 | Send SOL | ⬜ PASS / ⬜ FAIL | |
| 5 | Receive ETH | ⬜ PASS / ⬜ FAIL | |
| 5 | Receive BTC | ⬜ PASS / ⬜ FAIL | |
| 5 | Receive SOL | ⬜ PASS / ⬜ FAIL | |
| 6 | Top-Up Navigation | ⬜ PASS / ⬜ FAIL | |
| 7 | Chain Switching | ⬜ PASS / ⬜ FAIL | |
| 8 | Navigation Complete | ⬜ PASS / ⬜ FAIL | |

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **BTC Transactions**: Requires UTXOs from faucets; first transaction may take time
2. **Network Speed**: Testnet RPCs may be slow during peak hours
3. **Faucet Limits**: Most faucets have rate limits (24-hour cooldowns)

### Troubleshooting

**Issue**: Balance not updating
- **Solution**: Pull down to refresh, check network connection, verify correct testnet

**Issue**: Transaction failing
- **Solution**: Ensure sufficient balance for gas/fees, check recipient address format, verify network connectivity

**Issue**: Faucet not sending
- **Solution**: Try alternative faucet, check 24-hour limit, verify address format

---

## 📞 Testing Support

### Useful Resources
- **Ethereum Sepolia**: https://sepolia.dev/
- **Bitcoin Testnet**: https://en.bitcoin.it/wiki/Testnet
- **Solana Devnet**: https://docs.solana.com/clusters#devnet

### Explorer Links
- **ETH Sepolia**: https://sepolia.etherscan.io/
- **BTC Testnet**: https://blockstream.info/testnet/
- **SOL Devnet**: https://explorer.solana.com/?cluster=devnet

---

## ✅ Sign-Off

**Testing Complete**: ⬜ YES / ⬜ NO

**Ready for Production**: ⬜ YES / ⬜ NO

**Critical Issues Found**: _____________

**Tester Signature**: _____________ **Date**: _____________

---

*This testing guide should be updated as new features are added or issues are discovered during testing.*