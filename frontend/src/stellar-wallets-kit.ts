import {
  allowAllModules,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";

const SELECTED_WALLET_ID = "selectedWalletId";

function getSelectedWalletId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_WALLET_ID);
}

let kit: StellarWalletsKit | null = null;
let isConnecting = false;

function getKit() {
  if (typeof window === "undefined") return null;
  
  if (!kit) {
    kit = new StellarWalletsKit({
      modules: allowAllModules(),
      network: WalletNetwork.TESTNET,
    });
  }
  
  return kit;
}

export async function signTransaction(txXdr: string) {
  const kitInstance = getKit();
  if (!kitInstance) throw new Error("Wallet kit not available on server side");
  return kitInstance.signTransaction(txXdr);
}
export async function getPublicKey() {
  if (!getSelectedWalletId()) return null;
  const kitInstance = getKit();
  if (!kitInstance) return null;
  
  try {
    // Use skipRequestAccess to prevent modal from appearing
    const { address } = await kitInstance.getAddress({ skipRequestAccess: true });
    return address;
  } catch (error) {
    // If getting address fails, wallet is likely disconnected
    console.log("Failed to get wallet address:", error);
    return null;
  }
}

export async function setWallet(walletId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SELECTED_WALLET_ID, walletId);
  }
  const kitInstance = getKit();
  if (kitInstance) {
    kitInstance.setWallet(walletId);
  }
}

export async function disconnect(callback?: () => Promise<void>) {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SELECTED_WALLET_ID);
  }
  const kitInstance = getKit();
  if (kitInstance) {
    kitInstance.disconnect();
  }
  if (callback) await callback();
}

export async function connect(callback?: () => Promise<void>) {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    console.log("Connection already in progress, ignoring duplicate call");
    return;
  }

  // Check if already connected
  const existingKey = await getPublicKey();
  if (existingKey) {
    console.log("Wallet already connected, skipping modal");
    if (callback) await callback();
    return;
  }

  const kitInstance = getKit();
  if (!kitInstance) throw new Error("Wallet kit not available on server side");
  
  // Debug: Check available wallets
  try {
    const supportedWallets = await kitInstance.getSupportedWallets();
    console.log("Available wallets:", supportedWallets);
  } catch (error) {
    console.log("Error getting supported wallets:", error);
  }
  
  isConnecting = true;
  
  try {
    await kitInstance.openModal({
      onWalletSelected: async (option) => {
        try {
          console.log("Wallet selected:", option);
          await setWallet(option.id);
          if (callback) await callback();
        } catch (e) {
          console.error(e);
        }
        return option.id;
      },
      onClosed: (err) => {
        console.log("Wallet modal closed:", err);
        // Reset connecting state when modal is closed without selection
        isConnecting = false;
      },
    });
  } finally {
    isConnecting = false;
  }
}

