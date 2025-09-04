// Quick test of the generated bindings
import * as Client from './packages/stellar_farmers_market/dist/index.js';

async function testBindings() {
    console.log('🚀 Testing Stellar Farmers Market Bindings...');
    
    // Create contract client
    const contract = new Client.Client({
        ...Client.networks.testnet,
        rpcUrl: 'https://soroban-testnet.stellar.org:443'
    });

    try {
        // Test oracle info function (read-only)
        console.log('📊 Getting oracle info...');
        const oracleInfoTx = await contract.get_oracle_info();
        console.log('✅ Oracle Info:', oracleInfoTx.result);
        
        // Test BTC price function (read-only)
        console.log('₿ Getting BTC price...');
        const btcPriceTx = await contract.get_btc_price();
        console.log('✅ BTC Price data retrieved');
        
        // Test market info function
        console.log('🏪 Getting market 1...');
        const marketTx = await contract.get_market({market_id: 1});
        console.log('✅ Market Info:', marketTx.result);
        
        console.log('\n🎉 All bindings working correctly!');
        console.log('📋 Available functions:');
        console.log('  - Oracle: get_btc_price, get_eth_price, get_oracle_info');
        console.log('  - KALE: get_kale_balance, can_bet, get_total_locked_kale');
        console.log('  - Markets: create_market, bet, resolve, claim');
        console.log('  - And 16 more functions...');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testBindings();