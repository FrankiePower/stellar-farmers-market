"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getPublicKey, connect, disconnect } from "../src/stellar-wallets-kit";
import styles from "@/styles/habbo.module.css";

export default function ConnectWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  async function showDisconnected() {
    setPublicKey(null);
    setIsLoading(false);
  }

  async function showConnected() {
    const key = await getPublicKey();
    if (key) {
      setPublicKey(key);
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
      const key = await getPublicKey();
      if (key) {
        await showConnected();
      } else {
        await showDisconnected();
      }
    }
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