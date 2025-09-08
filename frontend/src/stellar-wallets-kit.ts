import {
  allowAllModules,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";

let kitInstance: StellarWalletsKit | null = null;

export const getWalletKit = () => {
  // Client-side only check
  if (typeof window === "undefined") {
    throw new Error("getWalletKit can only be called on the client side");
  }

  if (!kitInstance) {
    try {
      kitInstance = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        modules: allowAllModules(),
      });
    } catch (error) {
      console.error("Failed to create StellarWalletsKit instance:", error);
      throw error;
    }
  }
  return kitInstance;
};

export async function signTransaction(txXdr: string) {
  const kit = getWalletKit();
  return kit.signTransaction(txXdr);
}

export async function getPublicKey() {
  try {
    const kit = getWalletKit();
    const { address } = await kit.getAddress();
    return address;
  } catch (error) {
    console.log("Failed to get wallet address:", error);
    return null;
  }
}

export async function setWallet(walletId: string) {
  const kit = getWalletKit();
  kit.setWallet(walletId);
}

export async function disconnect() {
  const kit = getWalletKit();
  await kit.disconnect();
}

export async function connect() {
  const kit = getWalletKit();
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          resolve(address);
        } catch (error) {
          reject(error);
        }
        return option.id;
      },
      onClosed: (err) => {
        reject(new Error("Wallet connection cancelled"));
      },
    });
  });
}

