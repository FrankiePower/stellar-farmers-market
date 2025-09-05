"use client";

// Types
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

// Mock prediction market client for now
class PredictionMarketClient {
  // Get all markets
  async getMarkets(): Promise<Market[]> {
    // Return mock data for now
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

  // Get specific market by ID
  async getMarket(marketId: number): Promise<Market | null> {
    const markets = await this.getMarkets();
    return markets.find(m => m.id === marketId) || null;
  }

  // Place a bet on a market
  async placeBet(marketId: number, outcome: "Yes" | "No", amount: string): Promise<any> {
    try {
      console.log(`Placing bet: Market ${marketId}, ${outcome}, ${amount} KALE`);
      
      // Simulate a successful transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        hash: "mock_transaction_hash_" + Date.now()
      };
    } catch (error) {
      console.error("Failed to place bet:", error);
      throw error;
    }
  }

  // Get user's stakes in all markets
  async getUserStakes(userAddress: string): Promise<UserStake[]> {
    console.log("Getting user stakes for:", userAddress);
    return [];
  }
}

// Export singleton instance
export const predictionMarketClient = new PredictionMarketClient();