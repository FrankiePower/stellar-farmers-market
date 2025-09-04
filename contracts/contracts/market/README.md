# KALE Farmers Market - Prediction Markets Contract

A Soroban smart contract for creating prediction markets using KALE tokens, demonstrating composability with the KALE farming ecosystem.

## Project Structure

```text
.
├── contracts/
│   └── market/              # Main prediction market contract
│       ├── src/
│       │   ├── lib.rs       # Contract implementation
│       │   └── test.rs      # Unit tests
│       ├── Cargo.toml       # Contract dependencies
│       ├── Makefile         # Build automation
│       └── README.md        # This file
```

## Architecture

**KALE Integration**: This contract integrates directly with KALE's Stellar Asset Contract (SAC):

- **KALE SAC**: Users bet with KALE tokens from their farmed balance
- **Prediction Markets**: Create yes/no betting markets on any topic
- **Winner Takes All**: Simple payout mechanism for resolved markets
- **Time-based Resolution**: Markets have betting close time and resolution time

## Contract Features

### Core Functions
- `init()` - Initialize with admin, resolver, and KALE SAC address
- `create_market()` - Create new prediction market with question and timestamps
- `bet()` - Place KALE bets on YES/NO outcomes
- `resolve()` - Resolver resolves market outcome (Yes/No/Invalid)
- `claim()` - Claim winnings from resolved markets

### KALE Integration Functions
- `get_kale_balance(user)` - Check user's KALE balance
- `can_bet(user, amount)` - Verify if user has enough KALE to bet
- `get_total_locked_kale()` - See total KALE locked in all markets
- `get_kale_sac_address()` - Get KALE SAC address for frontend use

### View Functions
- `get_market(id)` - Get market details
- `get_stake(id, user)` - Get user's stake in a market
- `get_odds(id)` - Get current market odds (yes percentage * 100)

## Contract Deployment

### Prerequisites
- Stellar CLI installed and configured
- Identity configured for testnet/mainnet
- Testnet account with XLM funding
- Access to KALE tokens (farm them first!)

### Build Contract

Build the contract from the market directory:
```bash
cd contracts/market
make build
```

**Expected Output:**
```
✅ Build Complete
   Wasm File: /path/to/stellar_farmers_market.wasm
   Exported Functions: 16 found
     • bet, claim, create_market, get_kale_balance, etc.
```

### Deploy Contract

Deploy to testnet with KALE SAC integration:

```bash
# Deploy the farmers market contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/stellar_farmers_market.wasm \
  --source your-identity \
  --network testnet \
  --alias farmers_market \
  -- \
  --admin YOUR_ADMIN_ADDRESS \
  --resolver YOUR_RESOLVER_ADDRESS \
  --kale_sac_address CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ
```

**KALE SAC Addresses:**
- **Testnet**: `CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ`
- **Mainnet**: `CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV`

### Deployment Result

**Latest Testnet Deployment:**
- **Contract ID**: `CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266`
- **Network**: Stellar Testnet
- **KALE Integration**: Uses KALE SAC for all token operations
- **Admin**: `GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA`
- **Resolver**: `GBL4FMN3MPLPA2IS7T2K5VAGGVT4WJWJ24YXYFAHIFOGGCVEM6WVVAQA`
- **KALE SAC**: `CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ`
- **Explorer**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266)

### Verify Deployment

Test basic functionality:

```bash
# Set contract ID for easier reference
MARKET_ID="CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266"

# Check admin
stellar contract invoke \
  --id $MARKET_ID \
  --source your-identity \
  --network testnet \
  -- get_admin

# Check KALE SAC address
stellar contract invoke \
  --id $MARKET_ID \
  --source your-identity \
  --network testnet \
  -- get_kale_sac_address

# Check your KALE balance
stellar contract invoke \
  --id $MARKET_ID \
  --source your-identity \
  --network testnet \
  -- get_kale_balance \
  --user YOUR_ADDRESS
```

## Usage Examples

### 1. Create a Prediction Market

```bash
# Create a market about weather
stellar contract invoke \
  --id $MARKET_ID \
  --source your-identity \
  --network testnet \
  -- create_market \
  --creator YOUR_ADDRESS \
  --question "Will it rain tomorrow in San Francisco?" \
  --close_ts 1704157200 \
  --resolution_ts 1704243600
```

### 2. Place a Bet

```bash
# Bet 1000 KALE on YES
stellar contract invoke \
  --id $MARKET_ID \
  --source your-identity \
  --network testnet \
  -- bet \
  --user YOUR_ADDRESS \
  --market_id 1 \
  --side_yes true \
  --amount 1000000000  # 1000 KALE (7 decimals)
```

### 3. Check Market Status

```bash
# Get market details
stellar contract invoke \
  --id $MARKET_ID \
  --source your-identity \
  --network testnet \
  -- get_market \
  --market_id 1

# Get current odds
stellar contract invoke \
  --id $MARKET_ID \
  --source your-identity \
  --network testnet \
  -- get_odds \
  --market_id 1
```

### 4. Resolve Market (Resolver Only)

```bash
# Resolve market as YES
stellar contract invoke \
  --id $MARKET_ID \
  --source resolver-identity \
  --network testnet \
  -- resolve \
  --market_id 1 \
  --outcome '{"tag": "Yes", "values": null}'
```

### 5. Claim Winnings

```bash
# Claim your winnings
stellar contract invoke \
  --id $MARKET_ID \
  --source your-identity \
  --network testnet \
  -- claim \
  --user YOUR_ADDRESS \
  --market_id 1
```

## KALE Integration Guide

### Getting KALE Tokens

Before using the prediction market, you need KALE tokens:

1. **Visit KALE Farm**: https://testnet.kalefarm.xyz/
2. **Farm KALE**: Follow the `plant → work → harvest` process
3. **Check Balance**: Use the contract's `get_kale_balance()` function

### KALE Contract Addresses

- **KALE Farming Contract (Testnet)**: `CDSWUUXGPWDZG76ISK6SUCVPZJMD5YUV66J2FXFXFGDX25XKZJIEITAO`
- **KALE SAC (Testnet)**: `CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ`

### Integration Benefits

This contract demonstrates **real composability** with KALE:
- Users can bet KALE they've earned from farming
- Markets provide new utility for KALE beyond farming
- Creates a prediction market ecosystem powered by proof-of-work

## Testing Commands

Run the full test suite:

```bash
cd contracts/market
make test
```

**Test Coverage:**
- Contract initialization
- Market creation and betting
- Market resolution and claiming
- KALE integration functions
- Edge cases and error handling

## Common Issues & Solutions

### Build Errors
```bash
# If you get "can't find crate for 'core'" error:
rustup target add wasm32v1-none
```

### Deployment Errors
```bash
# Error: "Missing argument admin"
# Solution: Include constructor arguments after --
stellar contract deploy --wasm contract.wasm --source identity --network testnet \
  -- --admin ADDR --resolver ADDR --kale_sac_address ADDR
```

### KALE Balance Issues
```bash
# Check if you have KALE tokens first:
stellar contract invoke --id CAAVU2... --source identity --network testnet -- balance --id YOUR_ADDRESS

# If zero, farm some KALE first at testnet.kalefarm.xyz
```

## Integration with Frontend

The contract is designed for easy frontend integration:

```javascript
// Check user's KALE balance
const balance = await contract.get_kale_balance({user: userAddress});

// Verify user can bet amount
const canBet = await contract.can_bet({user: userAddress, amount: betAmount});

// Get market odds for UI display
const odds = await contract.get_odds({market_id: marketId}); // Returns basis points
const percentage = odds / 100; // Convert to percentage
```

## Hackathon Demonstration

This contract showcases:
- **KALE Composability**: Direct integration with KALE farming ecosystem
- **Stellar Best Practices**: Follows stellar-resolver patterns for reliability
- **Real Utility**: Creates new use cases for farmed KALE tokens
- **Community Value**: Enables prediction markets for any topic

Perfect for the "Compose the Future on Stellar" hackathon theme!

## Next Steps

1. **Deploy to Testnet** ✅
2. **Test with Real KALE** 
3. **Add Reflector Integration** (for automatic resolution)
4. **Build Frontend Interface**
5. **Deploy to Mainnet**

---

**Links:**
- [KALE Project](https://kaleonstellar.com/)
- [KALE Farm (Testnet)](https://testnet.kalefarm.xyz/)
- [Stellar Expert](https://stellar.expert/explorer/testnet)