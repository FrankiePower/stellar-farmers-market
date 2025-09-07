#!/bin/bash

# KALE Farmers Market - Contract Testing Script
# Usage: ./test_contract.sh [testnet|mainnet]

set -e

# Configuration
NETWORK=${1:-testnet}
MARKET_ID="CDK6F6KYKOPLYOXVBIWJIWHBMAY5ADWIC7MRFJFDVPYDTLGYRFKFA266"
IDENTITY="franky"  # Change this to your identity

# KALE addresses by network
if [ "$NETWORK" = "testnet" ]; then
    KALE_SAC="CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ"
    KALE_FARM="CDSWUUXGPWDZG76ISK6SUCVPZJMD5YUV66J2FXFXFGDX25XKZJIEITAO"
else
    KALE_SAC="CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV"
    KALE_FARM="CDL74RF5BLYR2YBLCCI7F5FB6TPSCLKEJUBSD2RSVWZ4YHF3VMFAIGWA"
fi

# Get user address
USER_ADDRESS=$(stellar keys address $IDENTITY)

echo "🧪 Testing KALE Farmers Market Contract"
echo "Network: $NETWORK"
echo "Contract: $MARKET_ID"
echo "User: $USER_ADDRESS"
echo "KALE SAC: $KALE_SAC"
echo ""

# Test 1: Basic contract info
echo "📋 Test 1: Contract Information"
echo "Admin:"
stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- get_admin
echo ""

echo "KALE SAC Address:"
stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- get_kale_sac_address
echo ""

# Test 2: KALE balance (will fail if no trustline)
echo "💰 Test 2: KALE Balance"
echo "Checking KALE balance for $USER_ADDRESS..."
if stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- get_kale_balance --user $USER_ADDRESS 2>/dev/null; then
    echo "✅ KALE balance check successful"
else
    echo "❌ KALE balance check failed (likely no trustline/KALE tokens)"
    echo "💡 To get KALE tokens:"
    echo "   1. Visit https://testnet.kalefarm.xyz/ (for testnet)"
    echo "   2. Farm some KALE tokens using plant → work → harvest"
    echo "   3. Come back and run this test again"
fi
echo ""

# Test 3: Create a market
echo "🏪 Test 3: Create Market"
CLOSE_TIME=$(($(date +%s) + 3600))    # 1 hour from now
RESOLVE_TIME=$(($(date +%s) + 7200))  # 2 hours from now

echo "Creating market: 'Will this test succeed?' closing at $CLOSE_TIME"
MARKET_RESULT=$(stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- create_market \
    --creator $USER_ADDRESS \
    --question "Will this test succeed?" \
    --close_ts $CLOSE_TIME \
    --resolution_ts $RESOLVE_TIME 2>/dev/null || echo "FAILED")

if [ "$MARKET_RESULT" != "FAILED" ]; then
    echo "✅ Market created with ID: $MARKET_RESULT"
    TEST_MARKET_ID=$MARKET_RESULT
else
    echo "❌ Failed to create market"
    echo "Using existing market ID 1 for testing..."
    TEST_MARKET_ID=1
fi
echo ""

# Test 4: Get market details
echo "📊 Test 4: Market Details"
echo "Market $TEST_MARKET_ID details:"
stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- get_market --market_id $TEST_MARKET_ID
echo ""

echo "Market $TEST_MARKET_ID odds:"
ODDS=$(stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- get_odds --market_id $TEST_MARKET_ID)
PERCENTAGE=$(echo "scale=2; $ODDS / 100" | bc 2>/dev/null || echo "$ODDS basis points")
echo "YES: $PERCENTAGE%"
echo ""

# Test 5: Try to bet (will fail without KALE)
echo "🎰 Test 5: Betting Test"
echo "Checking if you can bet 100 KALE..."
if stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- can_bet --user $USER_ADDRESS --amount 1000000000 2>/dev/null; then
    echo "✅ You have enough KALE to bet!"
    
    echo "Placing a 100 KALE bet on YES..."
    if stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- bet \
        --user $USER_ADDRESS --market_id $TEST_MARKET_ID --side_yes true --amount 1000000000 2>/dev/null; then
        echo "✅ Bet placed successfully!"
        
        echo "Updated market odds:"
        ODDS=$(stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- get_odds --market_id $TEST_MARKET_ID)
        PERCENTAGE=$(echo "scale=2; $ODDS / 100" | bc 2>/dev/null || echo "$ODDS basis points")
        echo "YES: $PERCENTAGE%"
    else
        echo "❌ Failed to place bet"
    fi
else
    echo "❌ Not enough KALE to bet (need 100 KALE minimum)"
fi
echo ""

# Test 6: Check total locked KALE
echo "🔒 Test 6: Total Locked KALE"
LOCKED=$(stellar contract invoke --id $MARKET_ID --source $IDENTITY --network $NETWORK -- get_total_locked_kale)
echo "Total KALE locked in all markets: $LOCKED"
echo ""

echo "🎉 Testing complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Get KALE tokens: https://testnet.kalefarm.xyz/"
echo "2. Place bets on markets"
echo "3. Wait for resolution time"
echo "4. Resolve markets (as resolver)"
echo "5. Claim winnings"
echo ""
echo "🔗 Contract Explorer: https://stellar.expert/explorer/$NETWORK/contract/$MARKET_ID"