"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import ConnectWallet from "@/components/ConnectWallet";
import { predictionMarketClient, type Market } from "@/src/contracts/predictionMarket";
import { getPublicKey } from "@/src/stellar-wallets-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PredictionMarketsPage() {
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [bettingMarket, setBettingMarket] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Market creation form state
  const [marketForm, setMarketForm] = useState({
    question: "",
    closeDate: "",
    closeTime: "",
    resolutionDate: "",
    resolutionTime: "",
  });

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

  const handleCreateMarket = async () => {
    try {
      if (!userAddress) {
        alert("Please connect your wallet first");
        return;
      }

      // Validate form
      if (!marketForm.question.trim()) {
        alert("Please enter a market question");
        return;
      }
      
      if (!marketForm.closeDate || !marketForm.closeTime) {
        alert("Please set a close date and time");
        return;
      }
      
      if (!marketForm.resolutionDate || !marketForm.resolutionTime) {
        alert("Please set a resolution date and time");
        return;
      }

      // Convert dates to timestamps
      const closeDateTime = new Date(`${marketForm.closeDate}T${marketForm.closeTime}`);
      const resolutionDateTime = new Date(`${marketForm.resolutionDate}T${marketForm.resolutionTime}`);
      
      // Validate dates
      const now = new Date();
      if (closeDateTime <= now) {
        alert("Close date must be in the future");
        return;
      }
      
      if (resolutionDateTime <= closeDateTime) {
        alert("Resolution date must be after the close date");
        return;
      }

      setCreateLoading(true);
      
      const result = await predictionMarketClient.createMarket(
        marketForm.question,
        Math.floor(closeDateTime.getTime() / 1000),
        Math.floor(resolutionDateTime.getTime() / 1000)
      );

      if (result) {
        // Reset form and close modal
        setMarketForm({
          question: "",
          closeDate: "",
          closeTime: "",
          resolutionDate: "",
          resolutionTime: "",
        });
        setShowCreateModal(false);
        
        // Refresh markets
        const updatedMarkets = await predictionMarketClient.getMarkets();
        setMarkets(updatedMarkets);
        
        alert("Market created successfully!");
      }
    } catch (error) {
      console.error("Failed to create market:", error);
      alert("Failed to create market. Please try again.");
    } finally {
      setCreateLoading(false);
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
          
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!userAddress}
            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-600/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Market
          </Button>
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

      {/* Create Market Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-green-700">
          <DialogHeader>
            <DialogTitle className="text-green-100">Create New Prediction Market</DialogTitle>
            <DialogDescription className="text-green-200">
              Set up a new market for users to predict and bet on outcomes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question" className="text-green-100">
                Market Question
              </Label>
              <Textarea
                id="question"
                placeholder="e.g., Will Bitcoin reach $200,000 by December 2025?"
                value={marketForm.question}
                onChange={(e) => setMarketForm(prev => ({ ...prev, question: e.target.value }))}
                className="bg-slate-800 border-green-700 text-green-100 placeholder:text-green-400"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="close-date" className="text-green-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Close Date
                </Label>
                <Input
                  id="close-date"
                  type="date"
                  value={marketForm.closeDate}
                  onChange={(e) => setMarketForm(prev => ({ ...prev, closeDate: e.target.value }))}
                  className="bg-slate-800 border-green-700 text-green-100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="close-time" className="text-green-100 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Close Time
                </Label>
                <Input
                  id="close-time"
                  type="time"
                  value={marketForm.closeTime}
                  onChange={(e) => setMarketForm(prev => ({ ...prev, closeTime: e.target.value }))}
                  className="bg-slate-800 border-green-700 text-green-100"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resolution-date" className="text-green-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Resolution Date
                </Label>
                <Input
                  id="resolution-date"
                  type="date"
                  value={marketForm.resolutionDate}
                  onChange={(e) => setMarketForm(prev => ({ ...prev, resolutionDate: e.target.value }))}
                  className="bg-slate-800 border-green-700 text-green-100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="resolution-time" className="text-green-100 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Resolution Time
                </Label>
                <Input
                  id="resolution-time"
                  type="time"
                  value={marketForm.resolutionTime}
                  onChange={(e) => setMarketForm(prev => ({ ...prev, resolutionTime: e.target.value }))}
                  className="bg-slate-800 border-green-700 text-green-100"
                />
              </div>
            </div>
            
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mt-2">
              <p className="text-sm text-green-200">
                📅 <strong>Close Date:</strong> When betting stops<br/>
                🏁 <strong>Resolution Date:</strong> When the outcome is determined
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(false)}
              className="border-green-700 text-green-200 hover:bg-green-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateMarket}
              disabled={createLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createLoading ? "Creating..." : "Create Market"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}