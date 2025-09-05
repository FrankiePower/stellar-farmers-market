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
      allowHttp: false,
      publicKey: async () => {
        const address = await getPublicKey();
        return address || "";
      },
      signTransaction: async (txXdr: string) => {
        const result = await signTransaction(txXdr);
        return result.signedTxXdr;
      },
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
          if (marketResult.result && !marketResult.error) {
            markets.push(this.convertMarket(marketResult.result, i));
          }
        } catch (error) {
          // Market doesn't exist, continue
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
      if (marketResult.result && !marketResult.error) {
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
      
      // Set up the client for this user
      this.client.options.publicKey = userAddress;
      this.client.options.signTransaction = signTransaction;
      
      // Build and sign the transaction
      const transaction = await this.client.bet({
        user: userAddress,
        market_id: marketId,
        side_yes: outcome === "Yes",
        amount: BigInt(amountStroops)
      });

      const { result } = await transaction.signAndSend();
      
      return {
        success: true,
        hash: transaction.hash || "unknown"
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
      
      // Set up the client for this user
      this.client.options.publicKey = userAddress;
      this.client.options.signTransaction = signTransaction;
      
      // Build and sign the transaction
      const transaction = await this.client.create_market({
        creator: userAddress,
        question: question,
        close_ts: BigInt(closeTs),
        resolution_ts: BigInt(resolutionTs)
      });

      const { result } = await transaction.signAndSend();
      
      return {
        success: true,
        marketId: result,
        hash: transaction.hash || "unknown"
      };
    } catch (error) {
      console.error("Failed to create market:", error);
      throw error;
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