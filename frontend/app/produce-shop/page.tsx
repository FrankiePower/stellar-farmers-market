"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ProduceShopPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-600">
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
            <h1 className="text-3xl font-bold text-white">Produce Shop</h1>
            <p className="text-green-200">Fresh vegetables and fruits from local farmers</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-semibold mb-4">🥕 Produce Stall</h2>
          <p className="text-lg mb-6">
            Sorry, this produce shop is currently closed for renovations!
          </p>
          <p className="text-green-200">
            Come back soon for fresh organic produce and sustainable farming goods.
          </p>
        </div>
      </div>
    </div>
  );
}