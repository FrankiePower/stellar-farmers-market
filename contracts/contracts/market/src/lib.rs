#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, contractclient,
    symbol_short, Address, Env, String, token
};

// -------------------------------
// Errors
// -------------------------------
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotResolver = 3,
    NotAdmin = 4,
    MarketClosed = 5,
    BetsClosed = 6,
    AlreadyResolved = 7,
    NotResolved = 8,
    NothingToClaim = 9,
    InvalidAmount = 10,
    InvalidTime = 11,
    MarketNotFound = 12,
}

// -------------------------------
// Core Types
// -------------------------------
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum Outcome {
    Yes,
    No,
    Invalid, // for refunds
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Market {
    pub id: u32,
    pub question: String,
    pub creator: Address,
    pub close_ts: u64,         // when betting closes
    pub resolution_ts: u64,    // when market can be resolved
    pub resolved: bool,
    pub outcome: Outcome,
    pub yes_pool: i128,        // total KALE staked on YES
    pub no_pool: i128,         // total KALE staked on NO
}

#[derive(Clone, Debug, Eq, PartialEq, Default)]
#[contracttype]
pub struct Stake {
    pub yes: i128,
    pub no: i128,
    pub claimed: bool,
}

// -------------------------------
// Storage keys
// -------------------------------
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DataKey {
    Admin,
    Resolver,
    KaleToken,
    NextMarketId,
    Market(u32),
    Stake(u32, Address), // (market_id, user)
}

// -------------------------------
// KALE Contract Interface
// -------------------------------
#[contractclient(name = "KaleClient")]
pub trait KaleContract {
    /// Get user's KALE balance from the SAC (Stellar Asset Contract)
    fn balance(env: Env, id: Address) -> i128;
    
    /// Transfer KALE between accounts (uses SAC)
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
}

// -------------------------------
// Token client helper
// -------------------------------
fn token_client<'a>(e: &'a Env, token: &'a Address) -> token::Client<'a> {
    token::Client::new(e, token)
}

// KALE SAC (Stellar Asset Contract) addresses
const KALE_SAC_MAINNET: &str = "CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV";
const KALE_SAC_TESTNET: &str = "CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ";

// -------------------------------
// Storage helpers
// -------------------------------
fn require_initialized(e: &Env) -> Result<(), Error> {
    if !e.storage().instance().has(&DataKey::KaleToken) {
        return Err(Error::NotInitialized);
    }
    Ok(())
}

fn read_address(e: &Env, key: &DataKey) -> Result<Address, Error> {
    e.storage().instance().get(key).ok_or(Error::NotInitialized)
}

fn write_address(e: &Env, key: DataKey, v: Address) {
    e.storage().instance().set(&key, &v);
}

fn read_u32(e: &Env, key: &DataKey) -> Result<u32, Error> {
    e.storage().instance().get(key).ok_or(Error::NotInitialized)
}

fn write_u32(e: &Env, key: DataKey, v: u32) {
    e.storage().instance().set(&key, &v);
}

fn read_market(e: &Env, id: u32) -> Result<Market, Error> {
    e.storage().persistent()
        .get(&DataKey::Market(id))
        .ok_or(Error::MarketNotFound)
}

fn write_market(e: &Env, m: &Market) {
    e.storage().persistent().set(&DataKey::Market(m.id), m);
}

fn read_stake(e: &Env, id: u32, user: &Address) -> Stake {
    e.storage().persistent()
        .get(&DataKey::Stake(id, user.clone()))
        .unwrap_or_default()
}

fn write_stake(e: &Env, id: u32, user: &Address, s: &Stake) {
    e.storage().persistent().set(&DataKey::Stake(id, user.clone()), s);
}

fn now(e: &Env) -> u64 {
    e.ledger().timestamp()
}

// -------------------------------
// Validation helpers
// -------------------------------
fn validate_market_timing(e: &Env, close_ts: u64, resolution_ts: u64) -> Result<(), Error> {
    if close_ts <= now(e) {
        return Err(Error::InvalidTime);
    }
    if resolution_ts <= close_ts {
        return Err(Error::InvalidTime);
    }
    Ok(())
}

fn validate_amount(amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}

// -------------------------------
// Contract
// -------------------------------
#[contract]
pub struct FarmersMarket;

#[contractimpl]
impl FarmersMarket {
    /// Initialize the contract with KALE SAC address
    pub fn init(
        e: Env, 
        admin: Address, 
        resolver: Address, 
        kale_sac_address: Address  // KALE's Stellar Asset Contract address
    ) -> Result<(), Error> {
        if e.storage().instance().has(&DataKey::KaleToken) {
            return Err(Error::AlreadyInitialized);
        }
        
        admin.require_auth();
        
        write_address(&e, DataKey::Admin, admin);
        write_address(&e, DataKey::Resolver, resolver);
        write_address(&e, DataKey::KaleToken, kale_sac_address);  // This is KALE's SAC address
        write_u32(&e, DataKey::NextMarketId, 1);
        
        e.events().publish((symbol_short!("Init"),), true);
        Ok(())
    }

    /// Create a new prediction market
    pub fn create_market(
        e: Env, 
        creator: Address, 
        question: String, 
        close_ts: u64,
        resolution_ts: u64
    ) -> Result<u32, Error> {
        require_initialized(&e)?;
        creator.require_auth();
        
        validate_market_timing(&e, close_ts, resolution_ts)?;

        let id = read_u32(&e, &DataKey::NextMarketId)?;

        let market = Market {
            id,
            question: question.clone(),
            creator: creator.clone(),
            close_ts,
            resolution_ts,
            resolved: false,
            outcome: Outcome::Invalid,
            yes_pool: 0,
            no_pool: 0,
        };
        
        write_market(&e, &market);
        write_u32(&e, DataKey::NextMarketId, id + 1);
        
        e.events().publish((symbol_short!("Created"), id, creator), question);
        Ok(id)
    }

    /// Place a bet on a market
    pub fn bet(
        e: Env, 
        user: Address, 
        market_id: u32, 
        side_yes: bool, 
        amount: i128
    ) -> Result<(), Error> {
        require_initialized(&e)?;
        user.require_auth();
        validate_amount(amount)?;
        
        let mut market = read_market(&e, market_id)?;
        
        if now(&e) >= market.close_ts {
            return Err(Error::BetsClosed);
        }

        // Transfer KALE from user to contract
        let token_addr = read_address(&e, &DataKey::KaleToken)?;
        let token_client = token_client(&e, &token_addr);
        token_client.transfer(&user, &e.current_contract_address(), &amount);

        // Update pools and user stake
        let mut stake = read_stake(&e, market_id, &user);
        
        if side_yes {
            market.yes_pool += amount;
            stake.yes += amount;
        } else {
            market.no_pool += amount;
            stake.no += amount;
        }
        
        write_market(&e, &market);
        write_stake(&e, market_id, &user, &stake);
        
        e.events().publish((symbol_short!("Bet"), market_id, user), (side_yes, amount));
        Ok(())
    }

    /// Resolve a market (resolver only)
    pub fn resolve(e: Env, market_id: u32, outcome: Outcome) -> Result<(), Error> {
        require_initialized(&e)?;
        let resolver = read_address(&e, &DataKey::Resolver)?;
        resolver.require_auth();
        
        let mut market = read_market(&e, market_id)?;
        
        if market.resolved {
            return Err(Error::AlreadyResolved);
        }
        
        if now(&e) < market.resolution_ts {
            return Err(Error::InvalidTime);
        }
        
        market.resolved = true;
        market.outcome = outcome.clone();
        write_market(&e, &market);
        
        e.events().publish((symbol_short!("Resolved"), market_id), outcome);
        Ok(())
    }

    /// Claim winnings from a resolved market
    pub fn claim(e: Env, user: Address, market_id: u32) -> Result<i128, Error> {
        require_initialized(&e)?;
        user.require_auth();
        
        let market = read_market(&e, market_id)?;
        if !market.resolved {
            return Err(Error::NotResolved);
        }

        let mut stake = read_stake(&e, market_id, &user);
        if stake.claimed {
            return Err(Error::NothingToClaim);
        }

        let token_addr = read_address(&e, &DataKey::KaleToken)?;
        let token_client = token_client(&e, &token_addr);

        let payout = match market.outcome {
            Outcome::Invalid => {
                // Refund original stake
                stake.yes + stake.no
            }
            Outcome::Yes => {
                if stake.yes > 0 && market.yes_pool > 0 {
                    // Winner takes proportional share of total pool
                    let total_pool = market.yes_pool + market.no_pool;
                    (total_pool * stake.yes) / market.yes_pool
                } else {
                    0
                }
            }
            Outcome::No => {
                if stake.no > 0 && market.no_pool > 0 {
                    // Winner takes proportional share of total pool
                    let total_pool = market.yes_pool + market.no_pool;
                    (total_pool * stake.no) / market.no_pool
                } else {
                    0
                }
            }
        };

        if payout == 0 {
            return Err(Error::NothingToClaim);
        }

        // Mark as claimed and transfer payout
        stake.claimed = true;
        write_stake(&e, market_id, &user, &stake);
        
        token_client.transfer(&e.current_contract_address(), &user, &payout);
        
        e.events().publish((symbol_short!("Claimed"), market_id, user), payout);
        Ok(payout)
    }

    // -------------------------------
    // View Functions
    // -------------------------------

    pub fn get_market(e: Env, market_id: u32) -> Result<Market, Error> {
        read_market(&e, market_id)
    }
    
    pub fn get_stake(e: Env, market_id: u32, user: Address) -> Stake {
        read_stake(&e, market_id, &user)
    }

    pub fn get_admin(e: Env) -> Result<Address, Error> {
        read_address(&e, &DataKey::Admin)
    }

    pub fn get_resolver(e: Env) -> Result<Address, Error> {
        read_address(&e, &DataKey::Resolver)
    }

    pub fn get_kale_token(e: Env) -> Result<Address, Error> {
        read_address(&e, &DataKey::KaleToken)
    }

    /// Get market odds (yes percentage * 100)
    pub fn get_odds(e: Env, market_id: u32) -> Result<u32, Error> {
        let market = read_market(&e, market_id)?;
        let total = market.yes_pool + market.no_pool;
        
        if total == 0 {
            Ok(5000) // 50.00%
        } else {
            Ok(((market.yes_pool * 10000) / total) as u32)
        }
    }

    // -------------------------------
    // KALE Integration Functions
    // -------------------------------

    /// Get user's KALE balance (from KALE SAC)
    pub fn get_kale_balance(e: Env, user: Address) -> Result<i128, Error> {
        require_initialized(&e)?;
        let kale_sac = read_address(&e, &DataKey::KaleToken)?;
        let kale_client = KaleClient::new(&e, &kale_sac);
        Ok(kale_client.balance(&user))
    }

    /// Check if user has enough KALE for a bet
    pub fn can_bet(e: Env, user: Address, amount: i128) -> Result<bool, Error> {
        let balance = Self::get_kale_balance(e, user)?;
        Ok(balance >= amount)
    }

    /// Get total KALE locked in all active markets
    pub fn get_total_locked_kale(e: Env) -> Result<i128, Error> {
        require_initialized(&e)?;
        let kale_sac = read_address(&e, &DataKey::KaleToken)?;
        let contract_balance = KaleClient::new(&e, &kale_sac).balance(&e.current_contract_address());
        Ok(contract_balance)
    }

    /// Helper to get KALE SAC address (for frontend)
    pub fn get_kale_sac_address(e: Env) -> Result<Address, Error> {
        read_address(&e, &DataKey::KaleToken)
    }
}

mod test;
