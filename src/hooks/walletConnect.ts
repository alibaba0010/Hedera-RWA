import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
} from "@hashgraph/hedera-wallet-connect";
import { LedgerId } from "@hashgraph/sdk";
import { getEnv } from "@/utils";

let dAppConnectorInstance: DAppConnector | null = null;

export async function walletConnectFcn() {
  if (dAppConnectorInstance) {
    return { dAppConnector: dAppConnectorInstance };
  }

  const walletConnectProjectId = getEnv("VITE_PUBLIC_PROJECT_ID");
  console.log(
    "Initializing WalletConnect with Project ID:",
    walletConnectProjectId,
  );

  const appMetadata = {
    name: "Hedera-RWA Marketplace",
    description: "Real World Asset Marketplace on Hedera",
    icons: ["https://avatars.githubusercontent.com/u/31002956?s=200&v=4"],
    url:
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
  };
  dAppConnectorInstance = new DAppConnector(
    appMetadata,
    LedgerId.TESTNET,
    walletConnectProjectId,
    Object.values(HederaJsonRpcMethod),
    [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
    [HederaChainId.Mainnet, HederaChainId.Testnet],
  );
  try {
    await dAppConnectorInstance.init({ logger: "error" });
    console.log("WalletConnect initialized successfully");
  } catch (error) {
    console.error("Failed to initialize WalletConnect:", error);
    dAppConnectorInstance = null; // Reset on failure so it can be retried
    throw error;
  }

  return { dAppConnector: dAppConnectorInstance };
}
