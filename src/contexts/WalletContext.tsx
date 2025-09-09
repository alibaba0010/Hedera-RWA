import { useEffect, useState, useMemo, createContext, ReactNode } from "react";
import PropTypes from "prop-types";
import { useAccount, useConnect, useDisconnect } from "wagmi";
interface WalletContextType {
  walletData: any;
  accountId: string | null;
  evmAddress: string | null;
  userProfile: any;
  balance: string | null;
  connectWallet: () => Promise<void>;
  connectEvmWallet: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  walletType: "hedera" | "evm" | null;
  hederaAccountIds: string[];
  isPaired: boolean;
  pairingString: string;
  isEvmConnected: boolean;
}

export const WalletContext = createContext<WalletContextType>({
  walletData: null,
  accountId: null,
  evmAddress: null,
  userProfile: null,
  balance: null,
  connectWallet: async () => {},
  connectEvmWallet: async () => {},
  disconnect: () => {},
  connected: false,
  walletType: null,
  hederaAccountIds: [],
  isEvmConnected: false,
  isPaired: false,
  pairingString: "",
});

const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletData, setWalletData] = useState<any>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<"hedera" | "evm" | null>(null);
  const [hederaAccountIds, setHederaAccountIds] = useState<string[]>([]);
  const [isPaired, setIsPaired] = useState(false);
  const [pairingString, setPairingString] = useState("");

  // RainbowKit (wagmi) hooks for EVM
  const { isConnected: isEvmConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync: evmDisconnect } = useDisconnect();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isMounted = true;
    (async () => {
      if (typeof window === "undefined") return;
      try {
        if (window !== undefined) {
          const { useHashConnect } = await import("@/hooks/useHashConnect");
          const { setupHashConnectListeners } = useHashConnect();
          cleanup = setupHashConnectListeners(
            ({ accountIds, isConnected, pairingString }) => {
              if (!isMounted) return;
              setHederaAccountIds(accountIds);
              setIsPaired(isConnected);
              setPairingString(pairingString);
              if (isConnected && accountIds.length > 0) {
                setAccountId(accountIds[0]);
                setWalletType("hedera");
              }
            }
          );
        }
      } catch (e) {
        // Ignore if not available
      }
    })();
    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  // Hedera wallet connect (dynamic import)
  const connectWallet = async () => {
    if (typeof window === "undefined") return;

    try {
      const WalletConnectModule = await import("@/hooks/walletConnect");
      if (!isPaired) {
        await WalletConnectModule.hc.init();
        WalletConnectModule.hc.openPairingModal();
        // Wait for pairing for up to 4 seconds
        await new Promise((resolve) => setTimeout(resolve, 4000));
        if (!isPaired) {
          // Not paired after timeout, try EVM wallet
          if (window.ethereum) {
            const { addOrSwitchHederaTestnet } = await import(
              "@/hooks/useEvmWallet"
            );
            await window.ethereum.request({ method: "eth_requestAccounts" });
            await addOrSwitchHederaTestnet();
            const accounts = await window.ethereum.request({
              method: "eth_accounts",
            });
            setAccountId(accounts[0]);
            setEvmAddress(accounts[0]);
            setWalletType("evm");
          } else {
            throw new Error("No EVM wallet found");
          }
        }
        return;
      } else {
        // If already paired, disconnect
        WalletConnectModule.hc.disconnect();
        setHederaAccountIds([]);
        setIsPaired(false);
        setPairingString("");
        setAccountId(null);
        setWalletType(null);
        return;
      }
    } catch (e) {
      console.log("HashPack connection failed, trying EVM wallet:", e);
      try {
        if (window.ethereum) {
          const { addOrSwitchHederaTestnet } = await import(
            "@/hooks/useEvmWallet"
          );
          await window.ethereum.request({ method: "eth_requestAccounts" });
          await addOrSwitchHederaTestnet();
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          setAccountId(accounts[0]);
          setWalletType("evm");
        } else {
          throw new Error("No EVM wallet found");
        }
      } catch (err) {
        console.error("EVM wallet connection failed:", err);
        setAccountId(null);
        setWalletType(null);
      }
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
    setUserProfile(null);
    setBalance(null);
    setWalletType(null);
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
    const getUserProfile = async () => {
      if (!accountId) return;
      try {
        const request = await fetch(
          "https://api.hashpack.app/user-profile/get",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ accountId: accountId, network: "testnet" }),
          }
        );
        if (!request.ok) {
          console.error(`Failed to fetch user profile: ${request.statusText}`);
          return;
        }
        const response = await request.json();
        setUserProfile(response);
      } catch (error) {
        console.error("Error fetching user profile data:", error);
      }
    };
    getUserProfile();
  }, [accountId]);

  // Dynamically import and use accountBalance
  useEffect(() => {
    if (!accountId) return;
    let isMounted = true;
    (async () => {
      try {
        const { default: accountBalance } = await import(
          "@/hooks/accountBalance"
        );
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
      userProfile,
      balance,
      connectWallet,
      connectEvmWallet,
      disconnect,
      connected: Boolean(accountId),
      isEvmConnected,
      walletType,
      hederaAccountIds,
      isPaired,
      pairingString,
      evmAddress,
    }),
    [
      walletData,
      accountId,
      evmAddress,
      userProfile,
      balance,
      connectWallet,
      connectEvmWallet,
      disconnect,
      isEvmConnected,
      walletType,
      hederaAccountIds,
      isPaired,
      pairingString,
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
