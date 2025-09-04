"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PredictionMarketsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Market
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Prediction Markets</h1>
            <p className="text-purple-200">Bet on the future with KALE tokens</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-semibold mb-4">🔮 Prediction Market Stall</h2>
          <p className="text-lg mb-6">
            Welcome to the Prediction Markets! Here you can bet on future events using KALE tokens.
          </p>
          
          <div className="space-y-4">
            <p className="text-purple-200">
              This is where we'll integrate the full prediction market interface similar to KALE Markets,
              but connected to our smart contract.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold mb-2">🎯 Market Features</h3>
                <ul className="text-sm text-purple-200 space-y-1">
                  <li>• Smart contract integration</li>
                  <li>• KALE token betting</li>
                  <li>• Oracle-based resolution</li>
                  <li>• Real-time odds calculation</li>
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold mb-2">🚀 Coming Soon</h3>
                <ul className="text-sm text-purple-200 space-y-1">
                  <li>• BTC/ETH price markets</li>
                  <li>• Custom market creation</li>
                  <li>• Automated payouts</li>
                  <li>• Market analytics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}