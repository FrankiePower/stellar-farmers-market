"use client";

import { Client, networks, type Market as ContractMarket } from "../../packages/stellar_farmers_market/src/index";
import { getPublicKey, signTransaction } from "@/src/stellar-wallets-kit";

// UI-friendly Market type
export interface Market {
  id: number;
  title: string;
  description: string;
  creator: string;
  closeTs: number;
  resolutionTs: number;
  status: "Open" | "Closed" | "Resolved";
  outcome?: "Yes" | "No" | "Invalid";
  totalYes: number;
  totalNo: number;
  resolved: boolean;
}

export interface UserStake {
  marketId: number;
  outcome: "Yes" | "No";
  amount: string;
}

// Contract client wrapper
class PredictionMarketClient {
  private client: Client;

  constructor() {
    this.client = new Client({
      ...networks.testnet,
      rpcUrl: "https://soroban-testnet.stellar.org:443",
    });
  }

  // Convert contract Market to UI Market
  private convertMarket(contractMarket: ContractMarket, id: number): Market {
    const totalYes = Number(contractMarket.yes_pool) / 10000000; // Convert from stroops
    const totalNo = Number(contractMarket.no_pool) / 10000000;
    
    let status: "Open" | "Closed" | "Resolved" = "Open";
    if (contractMarket.resolved) {
      status = "Resolved";
    } else if (Date.now() / 1000 > Number(contractMarket.close_ts)) {
      status = "Closed";
    }

    let outcome: "Yes" | "No" | "Invalid" | undefined;
    if (contractMarket.resolved && contractMarket.outcome) {
      if (contractMarket.outcome.tag === "Yes") outcome = "Yes";
      else if (contractMarket.outcome.tag === "No") outcome = "No";
      else outcome = "Invalid";
    }

    return {
      id,
      title: contractMarket.question,
      description: contractMarket.question, // Using question as description for now
      creator: contractMarket.creator,
      closeTs: Number(contractMarket.close_ts),
      resolutionTs: Number(contractMarket.resolution_ts),
      status,
      outcome,
      totalYes,
      totalNo,
      resolved: contractMarket.resolved
    };
  }

  // Get all markets (for now just get markets 1 and 2)
  async getMarkets(): Promise<Market[]> {
    try {
      const markets: Market[] = [];
      
      // Try to get first few markets
      for (let i = 1; i <= 5; i++) {
        try {
          const result = await this.client.get_market({ market_id: i });
          const marketResult = await result.simulate();
          
          // Handle Result<Market> type - check if it's successful
          if (marketResult.result && typeof marketResult.result === 'object' && 'unwrap' in marketResult.result) {
            try {
              const market = marketResult.result.unwrap();
              markets.push(this.convertMarket(market, i));
            } catch (unwrapError) {
              // Market might not exist or error occurred, continue
              console.log(`Market ${i} not found or error:`, unwrapError);
              break;
            }
          } else if (marketResult.result && !marketResult.error) {
            // Fallback if Result type doesn't have unwrap method
            markets.push(this.convertMarket(marketResult.result, i));
          }
        } catch (error) {
          console.log(`Error fetching market ${i}:`, error);
          break;
        }
      }

      // If no markets found, return mock data
      if (markets.length === 0) {
        return [
          {
            id: 1,
            title: "Bitcoin reaches $200k by December 2025?",
            description: "Will BTC hit the historic $200,000 milestone by end of 2025?",
            creator: "system",
            closeTs: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            resolutionTs: Math.floor(Date.now() / 1000) + (366 * 24 * 60 * 60),
            status: "Open",
            outcome: undefined,
            totalYes: 2.5,
            totalNo: 1.5,
            resolved: false
          },
          {
            id: 2,
            title: "Ethereum reaches $10k this cycle?", 
            description: "Will ETH break the $10,000 barrier in this bull cycle?",
            creator: "system",
            closeTs: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60),
            resolutionTs: Math.floor(Date.now() / 1000) + (181 * 24 * 60 * 60),
            status: "Open",
            outcome: undefined,
            totalYes: 3.0,
            totalNo: 2.0,
            resolved: false
          }
        ];
      }

      return markets;
    } catch (error) {
      console.error("Failed to get markets:", error);
      // Return mock data as fallback
      return [
        {
          id: 1,
          title: "Bitcoin reaches $200k by December 2025?",
          description: "Will BTC hit the historic $200,000 milestone by end of 2025?",
          creator: "system",
          closeTs: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
          resolutionTs: Math.floor(Date.now() / 1000) + (366 * 24 * 60 * 60),
          status: "Open",
          outcome: undefined,
          totalYes: 2.5,
          totalNo: 1.5,
          resolved: false
        }
      ];
    }
  }

  // Get specific market by ID
  async getMarket(marketId: number): Promise<Market | null> {
    try {
      const result = await this.client.get_market({ market_id: marketId });
      const marketResult = await result.simulate();
      
      // Handle Result<Market> type - check if it's successful
      if (marketResult.result && typeof marketResult.result === 'object' && 'unwrap' in marketResult.result) {
        try {
          const market = marketResult.result.unwrap();
          return this.convertMarket(market, marketId);
        } catch (unwrapError) {
          console.log(`Market ${marketId} not found:`, unwrapError);
          return null;
        }
      } else if (marketResult.result && !marketResult.error) {
        // Fallback if Result type doesn't have unwrap method
        return this.convertMarket(marketResult.result, marketId);
      }
      return null;
    } catch (error) {
      console.error("Failed to get market:", error);
      return null;
    }
  }

  // Place a bet on a market
  async placeBet(marketId: number, outcome: "Yes" | "No", amount: string): Promise<any> {
    try {
      const userAddress = await getPublicKey();
      if (!userAddress) throw new Error("Wallet not connected");

      console.log(`Placing bet: Market ${marketId}, ${outcome}, ${amount} KALE`);
      
      // Convert amount to stroops (7 decimal places)
      const amountStroops = Math.floor(parseFloat(amount) * 10000000);
      
      // Set up the client for this user (following Stellar docs pattern)
      this.client.options.publicKey = userAddress;
      this.client.options.signTransaction = signTransaction;
      
      // Build and sign the transaction
      const transaction = await this.client.bet({
        user: userAddress,
        market_id: marketId,
        side_yes: outcome === "Yes",
        amount: BigInt(amountStroops)
      });

      const txResult = await transaction.signAndSend();
      
      return {
        success: true,
        txHash: txResult.getTransactionResponse?.txHash || "unknown"
      };
    } catch (error) {
      console.error("Failed to place bet:", error);
      throw error;
    }
  }

  // Create a new market
  async createMarket(question: string, closeTs: number, resolutionTs: number): Promise<any> {
    try {
      const userAddress = await getPublicKey();
      if (!userAddress) throw new Error("Wallet not connected");

      console.log(`Creating market: ${question}, close: ${closeTs}, resolution: ${resolutionTs}`);
      
      // Set up the client for this user (following Stellar docs pattern)
      this.client.options.publicKey = userAddress;
      this.client.options.signTransaction = signTransaction;
      
      // Build and sign the transaction
      const transaction = await this.client.create_market({
        creator: userAddress,
        question: question,
        close_ts: BigInt(closeTs),
        resolution_ts: BigInt(resolutionTs)
      });

      const txResult = await transaction.signAndSend();
      
      return {
        success: true,
        marketId: txResult.result,
        txHash: txResult.getTransactionResponse?.txHash || "unknown"
      };
    } catch (error) {
      console.error("Failed to create market:", error);
      throw error;
    }
  }

  // Resolve a market (admin/resolver only)
  async resolveMarket(marketId: number, outcome: "Yes" | "No" | "Invalid"): Promise<any> {
    try {
      const userAddress = await getPublicKey();
      if (!userAddress) throw new Error("Wallet not connected");

      console.log(`Resolving market ${marketId} with outcome: ${outcome}`);
      
      // Set up the client for this user (following Stellar docs pattern)
      this.client.options.publicKey = userAddress;
      this.client.options.signTransaction = signTransaction;
      
      // Convert outcome to contract format
      const contractOutcome = { tag: outcome, values: undefined };
      
      // Build and sign the transaction
      const transaction = await this.client.resolve({
        market_id: marketId,
        outcome: contractOutcome
      });

      const txResult = await transaction.signAndSend();
      
      return {
        success: true,
        txHash: txResult.getTransactionResponse?.txHash || "unknown"
      };
    } catch (error) {
      console.error("Failed to resolve market:", error);
      throw error;
    }
  }

  // Claim winnings from resolved market
  async claimWinnings(marketId: number): Promise<any> {
    try {
      const userAddress = await getPublicKey();
      if (!userAddress) throw new Error("Wallet not connected");

      console.log(`Claiming winnings from market ${marketId}`);
      
      // Set up the client for this user (following Stellar docs pattern)
      this.client.options.publicKey = userAddress;
      this.client.options.signTransaction = signTransaction;
      
      // Build and sign the transaction
      const transaction = await this.client.claim({
        user: userAddress,
        market_id: marketId
      });

      const txResult = await transaction.signAndSend();
      
      return {
        success: true,
        amount: txResult.result,
        txHash: txResult.getTransactionResponse?.txHash || "unknown"
      };
    } catch (error) {
      console.error("Failed to claim winnings:", error);
      throw error;
    }
  }

  // Get market odds (Yes percentage)
  async getOdds(marketId: number): Promise<number> {
    try {
      const result = await this.client.get_odds({ market_id: marketId });
      const oddsResult = await result.simulate();
      
      if (oddsResult.result && typeof oddsResult.result === 'object' && 'unwrap' in oddsResult.result) {
        return Number(oddsResult.result.unwrap());
      } else if (oddsResult.result) {
        return Number(oddsResult.result);
      }
      return 50; // Default 50/50 odds
    } catch (error) {
      console.error("Failed to get odds:", error);
      return 50;
    }
  }

  // Get user's KALE balance
  async getKaleBalance(userAddress: string): Promise<number> {
    try {
      const result = await this.client.get_kale_balance({ user: userAddress });
      const balanceResult = await result.simulate();
      
      if (balanceResult.result && typeof balanceResult.result === 'object' && 'unwrap' in balanceResult.result) {
        return Number(balanceResult.result.unwrap()) / 10000000; // Convert from stroops
      } else if (balanceResult.result) {
        return Number(balanceResult.result) / 10000000;
      }
      return 0;
    } catch (error) {
      console.error("Failed to get KALE balance:", error);
      return 0;
    }
  }

  // Check if user can place a bet
  async canBet(userAddress: string, amount: string): Promise<boolean> {
    try {
      const amountStroops = Math.floor(parseFloat(amount) * 10000000);
      const result = await this.client.can_bet({ 
        user: userAddress, 
        amount: BigInt(amountStroops) 
      });
      const canBetResult = await result.simulate();
      
      if (canBetResult.result && typeof canBetResult.result === 'object' && 'unwrap' in canBetResult.result) {
        return Boolean(canBetResult.result.unwrap());
      } else if (canBetResult.result) {
        return Boolean(canBetResult.result);
      }
      return false;
    } catch (error) {
      console.error("Failed to check if user can bet:", error);
      return false;
    }
  }


  // Get user's stakes in all markets
  async getUserStakes(userAddress: string): Promise<UserStake[]> {
    try {
      const stakes: UserStake[] = [];
      
      // Try to get stakes for first few markets
      for (let i = 1; i <= 5; i++) {
        try {
          const result = await this.client.get_stake({ market_id: i, user: userAddress });
          if (result && result.result && (result.result.yes > 0 || result.result.no > 0)) {
            if (result.result.yes > 0) {
              stakes.push({
                marketId: i,
                outcome: "Yes",
                amount: (Number(result.result.yes) / 10000000).toString()
              });
            }
            if (result.result.no > 0) {
              stakes.push({
                marketId: i,
                outcome: "No",
                amount: (Number(result.result.no) / 10000000).toString()
              });
            }
          }
        } catch (error) {
          // No stake for this market, continue
        }
      }
      
      return stakes;
    } catch (error) {
      console.error("Failed to get user stakes:", error);
      return [];
    }
  }
}

// Export singleton instance
export const predictionMarketClient = new PredictionMarketClient();