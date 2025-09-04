# KALE Farmers Market - Stellar CLI Command Cheatsheet

## 📋 Project Constants
```bash
# Contract & Asset Addresses
MARKET_CONTRACT="CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266"
KALE_SAC_TESTNET="CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ"
KALE_SAC_MAINNET="CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV"
KALE_FARM_TESTNET="CDSWUUXGPWDZG76ISK6SUCVPZJMD5YUV66J2FXFXFGDX25XKZJIEITAO"
KALE_FARM_MAINNET="CDL74RF5BLYR2YBLCCI7F5FB6TPSCLKEJUBSD2RSVWZ4YHF3VMFAIGWA"

# Asset Identifiers
KALE_ASSET_TESTNET="KALE:GCHPTWXMT3HYF4RLZHWBNRF4MPXLTJ76ISHMSYIWCCDXWUYOQG5MR2AB"
KALE_ASSET_MAINNET="KALE:GBDVX4VELCDSQ54KQJYTNHXAHFLBCA77ZY2USQBM4CSHTTV7DME7KALE"

# Identity
IDENTITY="franky"
USER_ADDRESS="GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA"
```

---

## 🔑 Identity & Key Management

### Generate New Identity
```bash
# Generate new identity with funding
stellar keys generate alice --fund --network testnet

# Generate identity and save to secure store
stellar keys generate alice --secure-store --fund --network testnet

# Generate from existing seed phrase
stellar keys add alice --seed-phrase
```

### Manage Identities
```bash
# List all identities
stellar keys ls -l

# Get public key/address
stellar keys address alice
stellar keys public-key alice

# Get secret key
stellar keys secret alice

# Set default identity
stellar keys use alice

# Remove identity
stellar keys rm alice

# Fund testnet account
stellar keys fund alice --network testnet
```

---

## 🌐 Network Management

### Add/Configure Networks
```bash
# Add custom network
stellar network add my-testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# List networks
stellar network ls -l

# Set default network
stellar network use testnet

# Check network health
stellar network health --network testnet
```

---

## 💰 KALE Token & Trustlines

### Establish KALE Trustline ⭐
```bash
# Create trustline to KALE (REQUIRED before receiving KALE!)
stellar tx new change-trust \
  --source franky \
  --network testnet \
  --line KALE:GCHPTWXMT3HYF4RLZHWBNRF4MPXLTJ76ISHMSYIWCCDXWUYOQG5MR2AB

# Check if trustline exists (via balance check)
stellar contract invoke \
  --id CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ \
  --source franky \
  --network testnet \
  --send=no \
  -- balance --id GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA
```

### KALE Farming Commands
```bash
# Plant (start farming with 0 stake)
stellar contract invoke \
  --id CDSWUUXGPWDZG76ISK6SUCVPZJMD5YUV66J2FXFXFGDX25XKZJIEITAO \
  --source franky \
  --network testnet \
  -- plant \
  --amount 0 \
  --farmer GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA

# Work (submit proof of work - need valid hash!)
stellar contract invoke \
  --id CDSWUUXGPWDZG76ISK6SUCVPZJMD5YUV66J2FXFXFGDX25XKZJIEITAO \
  --source franky \
  --network testnet \
  -- work \
  --farmer GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --nonce 12345678 \
  --hash 0000abcd1234567890abcdef1234567890abcdef1234567890abcdef12345678

# Harvest (claim rewards)
stellar contract invoke \
  --id CDSWUUXGPWDZG76ISK6SUCVPZJMD5YUV66J2FXFXFGDX25XKZJIEITAO \
  --source franky \
  --network testnet \
  -- harvest \
  --index 0 \
  --farmer GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA
```

### Check KALE Balance
```bash
# Check balance via KALE SAC
stellar contract invoke \
  --id CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ \
  --source franky \
  --network testnet \
  --send=no \
  -- balance --id GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA

# Check balance via our contract
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  --send=no \
  -- get_kale_balance \
  --user GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA
```

---

## 🏪 Smart Contract Development

### Build & Deploy
```bash
# Build contract
cd contracts/market
stellar contract build

# Deploy with constructor args
stellar contract deploy \
  --wasm target/wasm32v1-none/release/stellar_farmers_market.wasm \
  --source franky \
  --network testnet \
  --alias farmers_market \
  -- \
  --admin GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --resolver GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --kale_sac_address CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ
```

### Contract Management
```bash
# Add contract alias
stellar contract alias add farmers_market \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266

# List contract aliases
stellar contract alias ls

# Get contract info
stellar contract info interface --contract-id farmers_market --network testnet

# Generate TypeScript bindings
stellar contract bindings typescript \
  --contract-id farmers_market \
  --output-dir ./bindings \
  --network testnet
```

---

## 🎯 Farmers Market Contract Commands

### Initialize Contract
```bash
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  -- init \
  --admin GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --resolver GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --kale_sac_address CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ
```

### Market Operations
```bash
# Create market
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  -- create_market \
  --creator GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --question "Will Bitcoin hit \$100k in 2025?" \
  --close_ts 1756971763 \
  --resolution_ts 1756975363

# Place bet (1000 KALE on YES)
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  -- bet \
  --user GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --market_id 1 \
  --side_yes true \
  --amount 10000000000  # 1000 KALE (7 decimals)

# Resolve market (resolver only)
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  -- resolve \
  --market_id 1 \
  --outcome '{"tag": "Yes", "values": null}'

# Claim winnings
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  -- claim \
  --user GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --market_id 1
```

### View Functions (Read-only)
```bash
# Get market details
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  --send=no \
  -- get_market --market_id 1

# Get user stake
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  --send=no \
  -- get_stake \
  --market_id 1 \
  --user GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA

# Get market odds (basis points)
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  --send=no \
  -- get_odds --market_id 1

# Check if user can bet
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  --send=no \
  -- can_bet \
  --user GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --amount 10000000000

# Get total locked KALE
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  --send=no \
  -- get_total_locked_kale
```

---

## 🔍 Transaction & Event Monitoring

### View Transactions
```bash
# Get transaction by hash
stellar tx fetch result --hash TX_HASH --network testnet

# Watch contract events
stellar events \
  --count 100 \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --network testnet

# Get latest ledger info
stellar ledger latest --network testnet
```

### Simulate Before Sending
```bash
# Simulate transaction without sending
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  --send=no \
  -- bet \
  --user GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --market_id 1 \
  --side_yes true \
  --amount 1000000000
```

---

## 🛠️ Debugging & Development

### Contract Information
```bash
# Get contract functions help
stellar contract invoke \
  --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --source franky \
  --network testnet \
  -- --help

# Get contract interface
stellar contract info interface \
  --contract-id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --network testnet

# Get contract metadata
stellar contract info meta \
  --contract-id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 \
  --network testnet
```

### Testing & Validation
```bash
# Run contract tests
cd contracts/market
cargo test

# Build optimized contract
stellar contract optimize --wasm target/wasm32v1-none/release/stellar_farmers_market.wasm

# Check network health
stellar network health --network testnet
stellar doctor
```

---

## 📋 Useful Aliases & Scripts

### Environment Setup
```bash
# Add to ~/.bashrc or ~/.zshrc
export STELLAR_NETWORK=testnet
export STELLAR_ACCOUNT=franky

# Quick aliases
alias sk="stellar keys"
alias sc="stellar contract"
alias sn="stellar network"

# Market contract shortcut
alias market="stellar contract invoke --id CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266 --source franky --network testnet --"

# Usage: market get_market --market_id 1
```

### Quick Scripts
```bash
# Check KALE balance script
check_kale() {
  stellar contract invoke \
    --id CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ \
    --source franky \
    --network testnet \
    --send=no \
    -- balance --id $1
}

# Usage: check_kale GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA
```

---

## 🚨 Important Notes

### Trustlines
- **MUST establish trustline before receiving KALE tokens**
- Use `stellar tx new change-trust --line KALE:ISSUER_ADDRESS`
- Check balance to verify trustline exists

### KALE Amounts
- KALE has **7 decimals**
- 1 KALE = 10,000,000 base units
- Always multiply by 10^7 when specifying amounts

### Transaction Fees
- Default fee: 100 stroops (0.00001 XLM)
- Increase fee for complex transactions: `--fee 1000`

### Testing
- Always use `--send=no` for read-only operations
- Use `--network testnet` for testing
- Fund accounts with `stellar keys fund IDENTITY --network testnet`

---

## 🔗 Useful Links
- [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet)
- [Contract Explorer](https://stellar.expert/explorer/testnet/contract/CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266)
- [KALE Farm (Testnet)](https://testnet.kalefarm.xyz/)
- [Stellar CLI Docs](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)