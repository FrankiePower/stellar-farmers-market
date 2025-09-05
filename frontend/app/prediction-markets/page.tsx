"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import ConnectWallet from "@/components/ConnectWallet";
import { predictionMarketClient, type Market } from "@/src/contracts/predictionMarket";
import { getPublicKey } from "@/src/stellar-wallets-kit";

export default function PredictionMarketsPage() {
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [bettingMarket, setBettingMarket] = useState<number | null>(null);

  // Load markets from smart contract
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setLoading(true);
        const contractMarkets = await predictionMarketClient.getMarkets();
        setMarkets(contractMarkets);
        
        // Get user address if wallet connected
        const address = await getPublicKey();
        setUserAddress(address);
      } catch (error) {
        console.error("Failed to load markets:", error);
        // Fallback to mock data if contract fails
        const mockMarkets = [
          {
            id: 1,
            title: "Bitcoin reaches $200k by December 2025?",
            description: "Will BTC hit the historic $200,000 milestone by end of 2025?",
            creator: "system",
            closeTs: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            resolutionTs: Math.floor(Date.now() / 1000) + (366 * 24 * 60 * 60),
            status: "Open" as const,
            outcome: undefined,
            totalYes: 0,
            totalNo: 0,
            resolved: false
          },
          {
            id: 2,
            title: "Ethereum reaches $10k this cycle?", 
            description: "Will ETH break the $10,000 barrier in this bull cycle?",
            creator: "system",
            closeTs: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60),
            resolutionTs: Math.floor(Date.now() / 1000) + (181 * 24 * 60 * 60),
            status: "Open" as const,
            outcome: undefined,
            totalYes: 0,
            totalNo: 0,
            resolved: false
          }
        ];
        setMarkets(mockMarkets);
      } finally {
        setLoading(false);
      }
    };

    loadMarkets();
  }, []);

  const filteredMarkets = markets.filter(m =>
    filter === "all" ? true : filter === "open" ? m.status === "Open" : m.status !== "Open"
  );

  const handleBet = async (marketId: number, outcome: "Yes" | "No", amount: string) => {
    try {
      if (!userAddress) {
        alert("Please connect your wallet first");
        return;
      }
      
      setBettingMarket(marketId);
      const result = await predictionMarketClient.placeBet(marketId, outcome, amount);
      
      if (result) {
        // Refresh markets after successful bet
        const updatedMarkets = await predictionMarketClient.getMarkets();
        setMarkets(updatedMarkets);
        alert("Bet placed successfully!");
      }
    } catch (error) {
      console.error("Betting failed:", error);
      alert("Failed to place bet. Please try again.");
    } finally {
      setBettingMarket(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-700">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" className="border-green-300 text-green-100 hover:bg-green-800">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Market
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-green-300">
                    🔮
                  </div>
                  <h1 className="text-3xl font-bold text-white">Prediction Markets</h1>
                </div>
                <p className="text-green-200">Discover and bet on the most popular prediction markets</p>
              </div>
            </div>
            <ConnectWallet />
          </div>
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-green-300/20">
            <div className="flex items-center gap-3">
              <div className="text-green-300">📊</div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {loading ? "..." : markets.length}
                </div>
                <div className="text-green-200 text-sm">Total Markets</div>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-green-300/20">
            <div className="flex items-center gap-3">
              <div className="text-green-300">⏰</div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {loading ? "..." : filteredMarkets.filter(m => m.status === "Open").length}
                </div>
                <div className="text-green-200 text-sm">Open Markets</div>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-green-300/20">
            <div className="flex items-center gap-3">
              <div className="text-green-300">✅</div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {loading ? "..." : markets.filter(m => m.resolved).length}
                </div>
                <div className="text-green-200 text-sm">Resolved Markets</div>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-green-300/20">
            <div className="flex items-center gap-3">
              <div className="text-green-300">🥬</div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {loading ? "..." : markets.reduce((total, m) => total + m.totalYes + m.totalNo, 0).toFixed(1)}
                </div>
                <div className="text-green-200 text-sm">Total KALE Pool</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter("open")}
              variant={filter === "open" ? "default" : "outline"}
              className={filter === "open" 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "border-green-300 text-green-200 hover:bg-green-800"
              }
            >
              Open Markets
            </Button>
            <Button
              onClick={() => setFilter("closed")}
              variant={filter === "closed" ? "default" : "outline"}
              className={filter === "closed" 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "border-green-300 text-green-200 hover:bg-green-800"
              }
            >
              Resolved
            </Button>
            <Button
              onClick={() => setFilter("all")}
              variant={filter === "all" ? "default" : "outline"}  
              className={filter === "all" 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "border-green-300 text-green-200 hover:bg-green-800"
              }
            >
              All Markets
            </Button>
          </div>
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold text-white mb-2">Loading markets...</h3>
              <p className="text-green-200">Fetching data from smart contracts</p>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🔮</div>
              <h3 className="text-xl font-semibold text-white mb-2">No markets available</h3>
              <p className="text-green-200">Check back soon for new prediction markets!</p>
            </div>
          ) : (
            filteredMarkets.map((market) => (
              <div
                key={market.id}
                className="bg-white/10 backdrop-blur-sm border border-green-300/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-200"
              >
                <div className="mb-4">
                  <h3 className="font-semibold text-white text-lg mb-2">{market.title}</h3>
                  <p className="text-green-200 text-sm">{market.description}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-300">Pool Size</span>
                    <span className="text-white font-medium">{(market.totalYes + market.totalNo).toFixed(1)} KALE</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-300">Status</span>
                    <span className="text-white font-medium">{market.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-300">Closes In</span>
                    <span className="text-white font-medium">
                      {Math.ceil((market.closeTs - Math.floor(Date.now() / 1000)) / (24 * 60 * 60))} days
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-green-300/20">
                  {!userAddress ? (
                    <p className="text-center text-green-200 text-sm mb-4">
                      Connect wallet to place bets
                    </p>
                  ) : (
                    <p className="text-center text-green-200 text-sm mb-4">
                      Bet 0.5 KALE on the outcome
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => handleBet(market.id, "Yes", "0.5")}
                      disabled={!userAddress || market.status !== "Open" || bettingMarket === market.id}
                      className="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-600/50"
                    >
                      {bettingMarket === market.id ? "..." : `YES ${market.totalYes + market.totalNo > 0 ? Math.round((market.totalYes / (market.totalYes + market.totalNo)) * 100) : 50}%`}
                    </Button>
                    <Button 
                      onClick={() => handleBet(market.id, "No", "0.5")}
                      disabled={!userAddress || market.status !== "Open" || bettingMarket === market.id}
                      className="bg-red-600 hover:bg-red-700 text-white disabled:bg-red-600/50"
                    >
                      {bettingMarket === market.id ? "..." : `NO ${market.totalYes + market.totalNo > 0 ? Math.round((market.totalNo / (market.totalYes + market.totalNo)) * 100) : 50}%`}
                    </Button>
                  </div>
                  
                  {market.resolved && market.outcome && (
                    <div className="mt-3 text-center">
                      <span className={`text-sm font-medium ${
                        market.outcome === "Yes" ? "text-green-400" : "text-red-400"
                      }`}>
                        Resolved: {market.outcome}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}