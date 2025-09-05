import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";

const SELECTED_WALLET_ID = "selectedWalletId";

function getSelectedWalletId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_WALLET_ID);
}

let kit: StellarWalletsKit | null = null;

function getKit() {
  if (typeof window === "undefined") return null;
  
  if (!kit) {
    kit = new StellarWalletsKit({
      modules: allowAllModules(),
      network: WalletNetwork.TESTNET,
      selectedWalletId: getSelectedWalletId() ?? FREIGHTER_ID,
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
  
  const { address } = await kitInstance.getAddress();
  return address;
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
  const kitInstance = getKit();
  if (!kitInstance) throw new Error("Wallet kit not available on server side");
  
  await kitInstance.openModal({
    onWalletSelected: async (option) => {
      try {
        await setWallet(option.id);
        if (callback) await callback();
      } catch (e) {
        console.error(e);
      }
      return option.id;
    },
  });
}