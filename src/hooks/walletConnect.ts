// "use client";
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
} from "@hashgraph/hedera-wallet-connect";
import { LedgerId } from "@hashgraph/sdk";
import { getEnv } from "@/utils";

// const env = "testnet";
// const projectId = "0c306a1b7d3106ac56154e190058a550";


export async function walletConnectFcn() {
  const walletConnectProjectId = getEnv("VITE_PUBLIC_PROJECT_ID");

  const appMetadata = {
    name: "HederaDEX",
    description: "Advanced DEX Aggregator for Hedera.",
    icons: ["https://avatars.githubusercontent.com/u/31002956?s=200&v=4"],
    url: window.location.origin,
  };

  const dAppConnector = new DAppConnector(
    appMetadata,
    LedgerId.TESTNET,
    walletConnectProjectId,
    Object.values(HederaJsonRpcMethod),
    [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
    [HederaChainId.Mainnet, HederaChainId.Testnet]
  );

  await dAppConnector.init({ logger: "error" });

  return { dAppConnector };
}
