# 🌾 Stellar Farmers Market

**A composable prediction market platform showcasing KALE + Reflector integration on Stellar**

Built for the **Compose the Future on Stellar** hackathon, demonstrating true ecosystem composability by combining KALE farming tokens with Reflector price oracles to create automated prediction markets.

## 🎯 **Hackathon Theme: Composability**

This project exemplifies Stellar ecosystem composability by integrating:
- **KALE Token**: Proof-of-teamwork farming token as the betting currency
- **Reflector Oracle**: Live price feeds for automated market resolution

## 🚀 **Live Testnet Deployment**

**Contract Address:** `CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV`

### **Quick Demo Commands:**

```bash
# Get live BTC price from Reflector
stellar contract invoke --id CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV --source franky --network testnet --send=no -- get_oracle_info

# Check if BTC is above $120k (auto-resolution demo)
stellar contract invoke --id CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV --source franky --network testnet --send=no -- is_btc_above_price --target_price_usd 120000

# View live demo market
stellar contract invoke --id CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV --source franky --network testnet --send=no -- get_market --market_id 1
```

## 🌟 **Key Features**

### **KALE Token Integration**
- **Primary Betting Currency**: All bets placed using KALE tokens
- **Balance Management**: Check user KALE holdings and betting eligibility
- **Seamless SAC Integration**: Direct interaction with KALE's Stellar Asset Contract
- **Proportional Payouts**: Winners receive KALE based on pool shares

### **Reflector Oracle Integration**  
- **Live Price Feeds**: Real-time BTC/ETH prices from Reflector's CEX/DEX oracle
- **Automated Resolution**: Markets auto-resolve based on actual price data
- **Cross-Asset Analysis**: ETH/BTC ratio comparisons using `x_last_price()`
- **TWAP Support**: Time-weighted average pricing for stability
- **Oracle Metadata**: Access to decimals, resolution, and update timestamps

### **Market Types Enabled**
1. **Price Target Markets**: "Will BTC reach $200k by 2025?"
2. **Cross-Asset Markets**: "Will ETH outperform BTC this quarter?"
3. **Manual Markets**: Traditional prediction markets with resolver
4. **KALE Price Markets**: "Will KALE hit $0.01?" (using Stellar oracle)

## 🔧 **Technical Architecture**

### **Smart Contract Functions (25 Total)**

#### **Core Market Functions**
- `create_market()` - Create prediction markets
- `bet()` - Place KALE bets on outcomes
- `resolve()` - Manual market resolution
- `claim()` - Claim winnings after resolution

#### **KALE Integration Functions**
- `get_kale_balance()` - Check user's KALE holdings
- `can_bet()` - Verify sufficient KALE for betting
- `get_total_locked_kale()` - Track total KALE in markets

#### **Reflector Oracle Functions**
- `get_btc_price()` - Live BTC/USD price
- `get_eth_price()` - Live ETH/USD price
- `get_btc_twap()` - Time-weighted average BTC price
- `get_eth_btc_ratio()` - Cross-price ETH/BTC ratio
- `is_btc_above_price()` - Price threshold checking
- `is_eth_above_price()` - ETH price threshold checking
- `get_oracle_info()` - Oracle metadata (decimals, resolution)
- `format_price_to_usd()` - Convert oracle prices to USD
- `demo_btc_200k_resolution()` - Demo auto-resolution

## 📊 **Integration Addresses**

| Component | Address | Network |
|-----------|---------|---------|
| **Farmers Market Contract** | `CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV` | Testnet |
| **KALE SAC** | `CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ` | Testnet |
| **Reflector CEX/DEX Oracle** | `CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63` | Testnet |
| **User Identity** | `GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA` | Testnet |

## 🛠️ **Development Setup**

### **Prerequisites**
- Stellar CLI installed and configured
- Rust toolchain with `wasm32-unknown-unknown` target
- KALE trustline established for testing

### **Build & Deploy**
```bash
# Build contract
stellar contract build

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/stellar_farmers_market.wasm \
  --source your_identity \
  --network testnet

# Initialize with KALE and Reflector integration
stellar contract invoke \
  --id CONTRACT_ID \
  --source your_identity \
  --network testnet \
  -- init \
  --admin YOUR_ADDRESS \
  --resolver YOUR_ADDRESS \
  --kale_sac_address CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ
```

### **Run Tests**
```bash
cargo test
```
All tests pass, including:
- KALE token integration tests
- Market creation and betting tests  
- Reflector oracle integration tests
- End-to-end resolution and claiming tests

## 🎮 **Usage Examples**

### **Create a Price-Based Market**
```bash
# Create "Will BTC reach $120k?" market
stellar contract invoke \
  --id CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV \
  --source franky --network testnet \
  -- create_market \
  --creator GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --question "Will BTC reach 120k by end of January 2025?" \
  --close_ts $(($(date +%s) + 86400)) \
  --resolution_ts $(($(date +%s) + 172800))
```

### **Place KALE Bet**
```bash
# Bet 100 KALE on YES
stellar contract invoke \
  --id CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV \
  --source franky --network testnet \
  -- bet \
  --user GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA \
  --market_id 1 \
  --side_yes true \
  --amount 1000000000  # 100 KALE (7 decimals)
```

### **Check Auto-Resolution**
```bash
# Check if BTC has reached target for auto-resolution
stellar contract invoke \
  --id CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV \
  --source franky --network testnet --send=no \
  -- is_btc_above_price --target_price_usd 120000
```

## 🏆 **Hackathon Achievements**

### **✅ KALE Integration**
- [x] Primary betting currency
- [x] Balance checking and validation
- [x] SAC integration for transfers
- [x] Proportional KALE payouts

### **✅ Reflector Integration**
- [x] Live price feeds (BTC, ETH)
- [x] Automated market resolution
- [x] Cross-price functionality
- [x] TWAP for price stability
- [x] Oracle metadata access

### **✅ Composability Demonstrated**
- [x] Two distinct Stellar protocols working together
- [x] New functionality enabled by integration
- [x] Automated price-based prediction markets
- [x] Live testnet deployment with working demos

## 🚀 **Future Potential**

- **Multi-Asset Support**: Extend to all Reflector-supported assets
- **Advanced Market Types**: Options, futures, complex derivatives
- **Cross-Chain Integration**: Bridge to other ecosystems
- **Governance**: KALE holders vote on market parameters
- **Liquidity Mining**: Reward market makers with KALE
- **Mobile dApp**: User-friendly interface for betting

## 🔗 **Links**

- **Contract Explorer**: [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV)
- **KALE Project**: [kaleonstellar.com](https://kaleonstellar.com/)
- **Reflector Network**: [reflector.network](https://reflector.network/)
- **Stellar Hackathon**: [Compose the Future on Stellar](https://stellar.org/events/hackathon)

---

**Built with ❤️ for the Stellar ecosystem, demonstrating the power of composability in DeFi applications.**