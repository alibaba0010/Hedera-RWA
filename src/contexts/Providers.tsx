"use client";

import React from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useState } from "react";
import { BrowserRouter } from "react-router-dom";

import { config as getConfig, chains } from "../config/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "../App";
import WalletProvider from "./WalletContext";
import { ThemeProvider } from "./theme-context";

const projectId = import.meta.env.VITE_PUBLIC_WALLET_CONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error("Missing VITE_PUBLIC_WALLET_CONNECT_PROJECT_ID");
}

export function Providers() {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider
                modalSize="compact"
                showRecentTransactions={false}
                initialChain={chains[0]}
              >
                <WalletProvider>
                  <App />
                </WalletProvider>
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
