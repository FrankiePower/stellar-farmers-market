import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBJEFRCLVFDDPTCBFUK6624SMPW7JOCG72TNGUHCBVSHKNLLSRWWPBZV",
  }
} as const

export const Errors = {
  1: {message:"NotInitialized"},
  2: {message:"AlreadyInitialized"},
  3: {message:"NotResolver"},
  4: {message:"NotAdmin"},
  5: {message:"MarketClosed"},
  6: {message:"BetsClosed"},
  7: {message:"AlreadyResolved"},
  8: {message:"NotResolved"},
  9: {message:"NothingToClaim"},
  10: {message:"InvalidAmount"},
  11: {message:"InvalidTime"},
  12: {message:"MarketNotFound"},
  13: {message:"OraclePriceUnavailable"}
}

export type Outcome = {tag: "Yes", values: void} | {tag: "No", values: void} | {tag: "Invalid", values: void};


export interface Market {
  close_ts: u64;
  creator: string;
  id: u32;
  no_pool: i128;
  outcome: Outcome;
  question: string;
  resolution_ts: u64;
  resolved: boolean;
  yes_pool: i128;
}


export interface Stake {
  claimed: boolean;
  no: i128;
  yes: i128;
}

export interface PriceData {
  price: i128;
  timestamp: u64;
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Resolver", values: void} | {tag: "KaleToken", values: void} | {tag: "NextMarketId", values: void} | {tag: "Market", values: readonly [u32]} | {tag: "Stake", values: readonly [u32, string]} | {tag: "ReflectorOracle", values: void};

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the contract with KALE SAC address and Reflector oracle
   */
  init: ({admin, resolver, kale_sac_address}: {admin: string, resolver: string, kale_sac_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_market transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new prediction market
   */
  create_market: ({creator, question, close_ts, resolution_ts}: {creator: string, question: string, close_ts: u64, resolution_ts: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a bet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Place a bet on a market
   */
  bet: ({user, market_id, side_yes, amount}: {user: string, market_id: u32, side_yes: boolean, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a resolve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Resolve a market (resolver only)
   */
  resolve: ({market_id, outcome}: {market_id: u32, outcome: Outcome}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claim winnings from a resolved market
   */
  claim: ({user, market_id}: {user: string, market_id: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_market transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_market: ({market_id}: {market_id: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<Market>>>

  /**
   * Construct and simulate a get_stake transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_stake: ({market_id, user}: {market_id: u32, user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Stake>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_resolver transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_resolver: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_kale_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_kale_token: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_odds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get market odds (yes percentage * 100)
   */
  get_odds: ({market_id}: {market_id: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a get_kale_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get user's KALE balance (from KALE SAC)
   */
  get_kale_balance: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a can_bet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if user has enough KALE for a bet
   */
  can_bet: ({user, amount}: {user: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a get_total_locked_kale transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total KALE locked in all active markets
   */
  get_total_locked_kale: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_kale_sac_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Helper to get KALE SAC address (for frontend)
   */
  get_kale_sac_address: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_btc_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get current BTC price from Reflector oracle
   */
  get_btc_price: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<PriceData>>>

  /**
   * Construct and simulate a get_eth_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get current ETH price from Reflector oracle
   */
  get_eth_price: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<PriceData>>>

  /**
   * Construct and simulate a is_btc_above_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if BTC price is above target (for market resolution)
   */
  is_btc_above_price: ({target_price_usd}: {target_price_usd: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a is_eth_above_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if ETH price is above target (for market resolution)
   */
  is_eth_above_price: ({target_price_usd}: {target_price_usd: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a get_eth_btc_ratio transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get ETH/BTC price ratio (cross-price functionality)
   */
  get_eth_btc_ratio: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_btc_twap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get Time-Weighted Average Price for BTC (last 5 periods)
   */
  get_btc_twap: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_oracle_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get oracle metadata (decimals, resolution, last update)
   */
  get_oracle_info: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<readonly [u32, u32, u64]>>>

  /**
   * Construct and simulate a format_price_to_usd transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Helper function to format price for display (converts from oracle decimals to readable USD)
   */
  format_price_to_usd: ({oracle_price}: {oracle_price: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a demo_btc_200k_resolution transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Demo: Auto-resolve a "Will BTC reach $200k?" type market
   */
  demo_btc_200k_resolution: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<Outcome>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "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",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAAAAAAAMZ2V0X3Jlc29sdmVyAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAAAAAAAOZ2V0X2thbGVfdG9rZW4AAAAAAAAAAAABAAAD6QAAABMAAAAD",
        "AAAAAAAAACZHZXQgbWFya2V0IG9kZHMgKHllcyBwZXJjZW50YWdlICogMTAwKQAAAAAACGdldF9vZGRzAAAAAQAAAAAAAAAJbWFya2V0X2lkAAAAAAAABAAAAAEAAAPpAAAABAAAAAM=",
        "AAAAAAAAACdHZXQgdXNlcidzIEtBTEUgYmFsYW5jZSAoZnJvbSBLQUxFIFNBQykAAAAAEGdldF9rYWxlX2JhbGFuY2UAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPpAAAACwAAAAM=",
        "AAAAAAAAACdDaGVjayBpZiB1c2VyIGhhcyBlbm91Z2ggS0FMRSBmb3IgYSBiZXQAAAAAB2Nhbl9iZXQAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAAAQAAAAM=",
        "AAAAAAAAACtHZXQgdG90YWwgS0FMRSBsb2NrZWQgaW4gYWxsIGFjdGl2ZSBtYXJrZXRzAAAAABVnZXRfdG90YWxfbG9ja2VkX2thbGUAAAAAAAAAAAAAAQAAA+kAAAALAAAAAw==",
        "AAAAAAAAAC1IZWxwZXIgdG8gZ2V0IEtBTEUgU0FDIGFkZHJlc3MgKGZvciBmcm9udGVuZCkAAAAAAAAUZ2V0X2thbGVfc2FjX2FkZHJlc3MAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAACtHZXQgY3VycmVudCBCVEMgcHJpY2UgZnJvbSBSZWZsZWN0b3Igb3JhY2xlAAAAAA1nZXRfYnRjX3ByaWNlAAAAAAAAAAAAAAEAAAPpAAAH0AAAAAlQcmljZURhdGEAAAAAAAAD",
        "AAAAAAAAACtHZXQgY3VycmVudCBFVEggcHJpY2UgZnJvbSBSZWZsZWN0b3Igb3JhY2xlAAAAAA1nZXRfZXRoX3ByaWNlAAAAAAAAAAAAAAEAAAPpAAAH0AAAAAlQcmljZURhdGEAAAAAAAAD",
        "AAAAAAAAADpDaGVjayBpZiBCVEMgcHJpY2UgaXMgYWJvdmUgdGFyZ2V0IChmb3IgbWFya2V0IHJlc29sdXRpb24pAAAAAAASaXNfYnRjX2Fib3ZlX3ByaWNlAAAAAAABAAAAAAAAABB0YXJnZXRfcHJpY2VfdXNkAAAACwAAAAEAAAPpAAAAAQAAAAM=",
        "AAAAAAAAADpDaGVjayBpZiBFVEggcHJpY2UgaXMgYWJvdmUgdGFyZ2V0IChmb3IgbWFya2V0IHJlc29sdXRpb24pAAAAAAASaXNfZXRoX2Fib3ZlX3ByaWNlAAAAAAABAAAAAAAAABB0YXJnZXRfcHJpY2VfdXNkAAAACwAAAAEAAAPpAAAAAQAAAAM=",
        "AAAAAAAAADNHZXQgRVRIL0JUQyBwcmljZSByYXRpbyAoY3Jvc3MtcHJpY2UgZnVuY3Rpb25hbGl0eSkAAAAAEWdldF9ldGhfYnRjX3JhdGlvAAAAAAAAAAAAAAEAAAPpAAAACwAAAAM=",
        "AAAAAAAAADhHZXQgVGltZS1XZWlnaHRlZCBBdmVyYWdlIFByaWNlIGZvciBCVEMgKGxhc3QgNSBwZXJpb2RzKQAAAAxnZXRfYnRjX3R3YXAAAAAAAAAAAQAAA+kAAAALAAAAAw==",
        "AAAAAAAAADdHZXQgb3JhY2xlIG1ldGFkYXRhIChkZWNpbWFscywgcmVzb2x1dGlvbiwgbGFzdCB1cGRhdGUpAAAAAA9nZXRfb3JhY2xlX2luZm8AAAAAAAAAAAEAAAPpAAAD7QAAAAMAAAAEAAAABAAAAAYAAAAD",
        "AAAAAAAAAFtIZWxwZXIgZnVuY3Rpb24gdG8gZm9ybWF0IHByaWNlIGZvciBkaXNwbGF5IChjb252ZXJ0cyBmcm9tIG9yYWNsZSBkZWNpbWFscyB0byByZWFkYWJsZSBVU0QpAAAAABNmb3JtYXRfcHJpY2VfdG9fdXNkAAAAAAEAAAAAAAAADG9yYWNsZV9wcmljZQAAAAsAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAADhEZW1vOiBBdXRvLXJlc29sdmUgYSAiV2lsbCBCVEMgcmVhY2ggJDIwMGs/IiB0eXBlIG1hcmtldAAAABhkZW1vX2J0Y18yMDBrX3Jlc29sdXRpb24AAAAAAAAAAQAAA+kAAAfQAAAAB091dGNvbWUAAAAAAw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<Result<void>>,
        create_market: this.txFromJSON<Result<u32>>,
        bet: this.txFromJSON<Result<void>>,
        resolve: this.txFromJSON<Result<void>>,
        claim: this.txFromJSON<Result<i128>>,
        get_market: this.txFromJSON<Result<Market>>,
        get_stake: this.txFromJSON<Stake>,
        get_admin: this.txFromJSON<Result<string>>,
        get_resolver: this.txFromJSON<Result<string>>,
        get_kale_token: this.txFromJSON<Result<string>>,
        get_odds: this.txFromJSON<Result<u32>>,
        get_kale_balance: this.txFromJSON<Result<i128>>,
        can_bet: this.txFromJSON<Result<boolean>>,
        get_total_locked_kale: this.txFromJSON<Result<i128>>,
        get_kale_sac_address: this.txFromJSON<Result<string>>,
        get_btc_price: this.txFromJSON<Result<PriceData>>,
        get_eth_price: this.txFromJSON<Result<PriceData>>,
        is_btc_above_price: this.txFromJSON<Result<boolean>>,
        is_eth_above_price: this.txFromJSON<Result<boolean>>,
        get_eth_btc_ratio: this.txFromJSON<Result<i128>>,
        get_btc_twap: this.txFromJSON<Result<i128>>,
        get_oracle_info: this.txFromJSON<Result<readonly [u32, u32, u64]>>,
        format_price_to_usd: this.txFromJSON<Result<i128>>,
        demo_btc_200k_resolution: this.txFromJSON<Result<Outcome>>
  }
}