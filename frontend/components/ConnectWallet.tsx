"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getPublicKey, connect, disconnect } from "../src/stellar-wallets-kit";
import styles from "@/styles/habbo.module.css";

interface ConnectWalletProps {
  onWalletChange?: (publicKey: string | null) => void;
}

export default function ConnectWallet({ onWalletChange }: ConnectWalletProps) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  async function showDisconnected() {
    setPublicKey(null);
    setIsLoading(false);
    onWalletChange?.(null);
  }

  async function showConnected() {
    const key = await getPublicKey();
    if (key) {
      setPublicKey(key);
      onWalletChange?.(key);
    } else {
      await showDisconnected();
    }
    setIsLoading(false);
  }

  const handleConnect = async () => {
    if (isConnecting) return; // Prevent multiple clicks
    
    setIsConnecting(true);
    setIsLoading(true);
    
    try {
      await connect(showConnected);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    await disconnect(showDisconnected);
  };

  useEffect(() => {
    async function checkConnection() {
      try {
        const key = await getPublicKey();
        if (key) {
          await showConnected();
        } else {
          await showDisconnected();
        }
      } catch (error) {
        console.log("Wallet check failed:", error);
        await showDisconnected();
      }
    }
    
    // Only check once on mount, don't poll continuously
    checkConnection();
  }, []);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading || isConnecting) {
    return (
      <Button className={styles.goButton} disabled>
        {isConnecting ? "Connecting..." : "Loading..."}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {publicKey ? (
        <>
          <span className="text-sm text-white/80" title={publicKey}>
            {shortenAddress(publicKey)}
          </span>
          <Button className={styles.goButton} size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </>
      ) : (
        <Button className={styles.goButton} onClick={handleConnect}>
          Connect Wallet
        </Button>
      )}
    </div>
  );
}