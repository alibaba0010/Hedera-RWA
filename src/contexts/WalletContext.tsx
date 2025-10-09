import { useEffect, useState, useMemo, createContext, ReactNode } from "react";
import PropTypes from "prop-types";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { walletConnectFcn } from "@/hooks/walletConnect";
import { DAppSigner } from "@hashgraph/hedera-wallet-connect";
import {
  getUserProfile,
} from "@/utils/mirror-node-client";
import { getBalanceFromMirrorNode } from "@/hooks/accountBalance";
interface WalletContextType {
  walletData: any;
  accountId: string | null;
  evmAddress: string | null;
  balance: string | null;
  userProfile: any;
  connectWallet: () => Promise<void>;
  connectEvmWallet: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  walletType: "hedera" | "evm" | null;
  isEvmConnected: boolean;
  signer?: DAppSigner;
}

export const WalletContext = createContext<WalletContextType>({
  walletData: null,
  accountId: null,
  evmAddress: null,
  balance: null,
  userProfile: null,
  connectWallet: async () => {},
  connectEvmWallet: async () => {},
  disconnect: () => {},
  connected: false,
  walletType: null,
  isEvmConnected: false,
  signer: {} as DAppSigner,
});

const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletData, setWalletData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<"hedera" | "evm" | null>(null);
  const [signer, setSigner] = useState<DAppSigner>();
  // RainbowKit (wagmi) hooks for EVM
  const { isConnected: isEvmConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync: evmDisconnect } = useDisconnect();
  // Hedera wallet connect (dynamic import)
  const connectWallet = async () => {
    try {
      // const WalletConnectModule = await import("@/hooks/walletConnect");
      // await WalletConnectModule.hc.init();
      // console.log("WalletConnectModule: ", WalletConnectModule);
      const { dAppConnector } = await walletConnectFcn();
      await dAppConnector.openModal();
      const signer = dAppConnector.signers[0];
      if (signer) {
        const userAccountId = signer.getAccountId().toString();
        setAccountId(userAccountId);
        setWalletData(dAppConnector);
        setSigner(signer);
        setWalletType("hedera");
        localStorage.setItem("walletConnected", "true");
        // Fetch user profile
        try {
          const profile = await getUserProfile(userAccountId);
          setUserProfile(profile);
        } catch (e) {
          setUserProfile(null);
        }
      }
    } catch (error: any) {
      console.log("Error message: ", error.message);
    }
  };

  // EVM wallet connect
  const connectEvmWallet = async () => {
    const connector = connectors[0];
    await connectAsync({ connector });
    setWalletType("evm");
  };

  // Disconnect
  const disconnect = () => {
    setWalletData(null);
    setAccountId(null);
    setEvmAddress(null);
    setBalance(null);
    setWalletType(null);
    localStorage.removeItem("walletConnected");

    if (walletType === "evm") {
      evmDisconnect();
    }
  };

  // Handle wallet state and validate Hedera account
  useEffect(() => {
    const validateHederaAccount = async (address: string) => {
      // Validate Hedera account ID format (0.0.xxx)
      const isHederaFormat = /^\d+\.\d+\.\d+$/.test(address);

      if (!isHederaFormat) {
        console.log("Not a valid Hedera account format");
        setAccountId(null);
        try {
          // Verify the account exists on the network
          const baseUrl =
            "https://testnet.mirrornode.hedera.com/api/v1/accounts/";
          const res = await fetch(`${baseUrl}${address}`);
          if (!res.ok) {
            console.log("Account not found on Hedera network");
            setAccountId(null);
            return;
          }

          const data = await res.json();
          if (data.account) {
            console.log("Valid Hedera account confirmed: ", data.account);
            setAccountId(data.account);
          } else {
            console.log("Invalid account data received");
            setAccountId(null);
          }
        } catch (e) {
          console.error("Error validating Hedera account:", e);
          setAccountId(null);
        }
      }
    };

    // When account changes, validate it
    if (accountId) {
      validateHederaAccount(accountId);
    }
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return;
    let isMounted = true;
    (async () => {
      try {
        const { default: accountBalance } = await import(
          "@/hooks/accountBalance"
        );
        await getBalanceFromMirrorNode(accountId);
        const newBalance = await accountBalance(accountId);
        if (isMounted) setBalance(newBalance as string | null);
      } catch (e) {
        // Ignore if not available
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [accountId]);

  const value = useMemo(
    () => ({
      walletData,
      accountId,
      balance,
      userProfile,
      connectWallet,
      connectEvmWallet,
      disconnect,
      connected: Boolean(accountId),
      isEvmConnected,
      walletType,
      evmAddress,
      signer,
    }),
    [
      walletData,
      accountId,
      evmAddress,
      balance,
      userProfile,
      connectWallet,
      connectEvmWallet,
      disconnect,
      isEvmConnected,
      walletType,
      signer,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

WalletProvider.propTypes = {
  children: PropTypes.node,
};

export default WalletProvider;
