"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TradingFloorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-900 via-yellow-800 to-yellow-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/?room=Rooftop">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Trading Area
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Trading Floor</h1>
            <p className="text-yellow-200">Agricultural commodities and futures trading</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-semibold mb-4">📈 Trading Floor</h2>
          <p className="text-lg mb-6">
            The trading floor is currently setting up new commodities markets!
          </p>
          <p className="text-yellow-200">
            Check back later for agricultural futures, crop price derivatives, and more.
          </p>
        </div>
      </div>
    </div>
  );
}