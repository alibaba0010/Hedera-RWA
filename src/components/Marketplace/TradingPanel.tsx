"use client";

import { useState, useEffect, useContext, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenAssociationManager } from "@/utils/token-association";
import { TokenId } from "@hashgraph/sdk";
import { Orders } from "./Orders";
import { TradingChart } from "../Trading/TradingChart";
import {
  subscribeToPriceUpdates,
  unsubscribeFromPriceUpdates,
  getTokenChartData,
  generateOrderBook,
  updateTokenPrice,
} from "@/utils/trading";
import { WalletContext } from "@/contexts/WalletContext";
import { TradingPanelProps } from "@/utils/assets";
import {
  buyAssetToken,
  getTokenBalanceByTokenId,
  sellAssetToken,
} from "@/utils/hedera-integration";
import { saveOrder, saveTrade, supabase } from "@/utils/supabase";
import { useNotification } from "@/contexts/notification-context";
import { LimitOrder } from "./LimitOrder";
import { usdcTokenId } from "@/utils";

export const TradingPanel = ({
  tokenomics,
  tokenSymbol,
  tokenId, // Add this to your TradingPanelProps interface
}: TradingPanelProps) => {
  const { accountId, walletType, evmAddress, signer, balance } =
    useContext(WalletContext);
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>(
    tokenomics.pricePerTokenUSD.toString()
  );
  const [chartData, setChartData] = useState<any[]>([]);
  const [orderBook, setOrderBook] = useState<any>({ asks: [], bids: [] });
  const [orders, setOrders] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(
    tokenomics.pricePerTokenUSD
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAssociation, setIsCheckingAssociation] = useState(false);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const { showNotification } = useNotification();
  const [tradingPair, setTradingPair] = useState<"USDC" | "HBAR">("HBAR");

  const handlePriceUpdate = useCallback(
    async (newPrice: number) => {
      setCurrentPrice(newPrice);

      // Get updated chart data
      const data = await getTokenChartData(
        tokenId,
        tokenomics.pricePerTokenUSD
      );

      // Transform to OHLC format
      const transformedData = data.map((point: any) => ({
        time: point.time,
        open: point.price,
        high: point.price * (1 + Math.random() * 0.02), // Simulated data
        low: point.price * (1 - Math.random() * 0.02), // Simulated data
        close: point.price,
        volume: point.volume,
      }));

      setChartData(transformedData);

      // Update order book
      const newOrders = generateOrderBook(newPrice);
      setOrderBook(newOrders);

      // Refresh orders list
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("token_id", tokenId)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);
    },
    [tokenId, tokenomics.pricePerTokenUSD]
  );

  useEffect(() => {
    // Initialize with current data
    const fetchData = async () => {
      try {
        const chartData = await getTokenChartData(
          tokenId,
          tokenomics.pricePerTokenUSD
        );
        // Transform data to include OHLC (Open, High, Low, Close)
        const transformedData = chartData.map((point: any) => ({
          time: point.time,
          open: point.price,
          high: point.price * (1 + Math.random() * 0.02), // Simulated data
          low: point.price * (1 - Math.random() * 0.02), // Simulated data
          close: point.price,
          volume: point.volume,
        }));
        setChartData(transformedData);

        // Fetch orders from supabase
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*")
          .eq("token_id", tokenId)
          .order("created_at", { ascending: false });

        setOrders(ordersData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const orders = generateOrderBook(currentPrice);
    setOrderBook(orders);

    // Subscribe to real-time order changes
    const ordersSubscription = supabase
      .channel(`orders_${tokenId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `token_id=eq.${tokenId}`,
        },
        (payload) => {
          // Re-fetch orders on any change
          supabase
            .from("orders")
            .select("*")
            .eq("token_id", tokenId)
            .order("created_at", { ascending: false })
            .then(({ data: updatedOrders }) => {
              setOrders(updatedOrders || []);
            });
        }
      )
      .subscribe();

    // Subscribe to price updates
    subscribeToPriceUpdates(
      tokenId,
      handlePriceUpdate,
      tokenomics.pricePerTokenUSD
    );

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(ordersSubscription);
      unsubscribeFromPriceUpdates(tokenId, handlePriceUpdate);
    };
  }, [tokenId, handlePriceUpdate, tokenomics.pricePerTokenUSD, currentPrice]);

  // Refactored: Always check both asset and USDC association if tradingPair is USDC
  const checkTokenAssociation = async (tokenId: string) => {
    setIsCheckingAssociation(true);
    try {
      const tokenManager = new TokenAssociationManager();
      if (!accountId)
        return { isAssetAssociated: false, isUsdcAssociated: false };

      // Check asset token association
      let isAssetAssociated = await tokenManager.isTokenAssociated(
        {
          type: walletType === "hedera" ? "hedera" : "evm",
          accountId,
          provider: walletType === "evm" ? window.ethereum : undefined,
          evmAddress: evmAddress || undefined,
        },
        TokenId.fromString(tokenId)
      );

      // Check USDC association if trading in USDC
      let isUsdcAssociated = true;
      if (tradingPair === "USDC") {
        isUsdcAssociated = await tokenManager.isTokenAssociated(
          {
            type: walletType === "hedera" ? "hedera" : "evm",
            accountId,
            provider: walletType === "evm" ? window.ethereum : undefined,
            evmAddress: evmAddress || undefined,
          },
          TokenId.fromString(usdcTokenId)
        );
      }

      // Associate asset token if needed
      if (!isAssetAssociated) {
        const receipt = await tokenManager.associateToken(
          {
            type: walletType === "hedera" ? "hedera" : "evm",
            accountId,
            signer,
            provider: walletType === "evm" ? window.ethereum : undefined,
            evmAddress: evmAddress || undefined,
            snapEnabled: false,
            network: "testnet",
          },
          tokenId
        );
        showNotification({
          title: "Success",
          message: `Successfully associated with ${tokenSymbol} token`,
          variant: "success",
        });
        isAssetAssociated = receipt === "SUCCESS";
      }

      // Associate USDC token if needed
      if (tradingPair === "USDC" && !isUsdcAssociated) {
        const receipt = await tokenManager.associateToken(
          {
            type: walletType === "hedera" ? "hedera" : "evm",
            accountId,
            signer,
            provider: walletType === "evm" ? window.ethereum : undefined,
            evmAddress: evmAddress || undefined,
            snapEnabled: false,
            network: "testnet",
          },
          usdcTokenId
        );
        showNotification({
          title: "Success",
          message: "Successfully associated with USDC token",
          variant: "success",
        });
        isUsdcAssociated = receipt === "SUCCESS";
      }

      return { isAssetAssociated, isUsdcAssociated };
    } catch (error: any) {
      showNotification({
        title: "Error",
        message: error.message || "Failed to check token association",
        variant: "error",
      });
      return { isAssetAssociated: false, isUsdcAssociated: false };
    } finally {
      setIsCheckingAssociation(false);
    }
  };

  const handleBuy = async () => {
    if (!amount || Number(amount) <= 0 || !accountId) {
      showNotification({
        title: "Error",
        message: "Please enter a valid amount and connect your wallet",
        variant: "error",
      });
      return;
    }
    const tokenBalance = await getTokenBalanceByTokenId(tokenId, accountId);
    console.log("Token id: ", tokenId, "Token balance: ", tokenBalance);
    try {
      setIsLoading(true);
      const actualAmount = Number(amount) * 100;

      // Check both associations
      const { isAssetAssociated, isUsdcAssociated } =
        await checkTokenAssociation(tokenId);
      if (!isAssetAssociated || !signer) {
        showNotification({
          title: "Error",
          message: `Token not associated. Please try again.`,
          variant: "error",
        });
        return;
      }
      if (tradingPair === "USDC" && !isUsdcAssociated) {
        showNotification({
          title: "Error",
          message: `USDC token not associated. Please try again.`,
          variant: "error",
        });
        return;
      }

      // Check USDC balance if trading with USDC
      if (tradingPair === "USDC") {
        const usdcBalance = await getTokenBalanceByTokenId(
          usdcTokenId,
          accountId
        );
        const requiredAmount = totalValue * 1_000_000; // Convert to lowest denomination
        if (Number(usdcBalance) < requiredAmount) {
          showNotification({
            title: "Error",
            message: `Insufficient USDC balance. You need ${(
              requiredAmount / 1_000_000
            ).toFixed(2)} USDC`,
            variant: "error",
          });
          return;
        }
      } else {
        if (Number(balance) < totalValue * 5) {
          showNotification({
            title: "Error",
            message: `Insufficient HBAR balance. You need ℏ${(
              totalValue * 5
            ).toFixed(2)}`,
            variant: "error",
          });
        }
      }

      // Calculate the total value in the selected trading pair
      const totalInTradingPair =
        tradingPair === "HBAR" ? totalValue * 5 : totalValue;
      // TODO: check if user has enough USDC balance if tradingPair === "USDC"
      const { status } = await buyAssetToken(
        tokenId,
        accountId,
        actualAmount,
        signer,
        tradingPair,
        totalInTradingPair
      );
      if (status === "SUCCESS") {
        await saveOrder({
          token_id: tokenId,
          amount: actualAmount,
          price: currentPrice,
          order_type: "buy",
          status: "completed",
          buyer_id: accountId,
        });
        await saveTrade({
          token_id: tokenId,
          price: currentPrice,
          volume: actualAmount,
          trade_type: "buy",
          trader_id: accountId,
        });
        const newPrice = await updateTokenPrice(
          tokenId,
          currentPrice,
          actualAmount,
          "buy"
        );
        showNotification({
          title: "Buy Order",
          message: `Successfully purchased ${amount} ${tokenSymbol} tokens for ${
            tradingPair === "HBAR" ? "ℏ" : "$"
          }${totalInTradingPair.toFixed(4)}`,
        });
      }
    } catch (error: any) {
      console.error("Buy order error:", error);
      showNotification({
        title: "Error",
        message: error.message || "Failed to place buy order",
        variant: "error",
      });
    } finally {
      setAmount("");
      setIsLoading(false);
    }
  };

  const handleSell = async () => {
    if (!amount || Number(amount) <= 0 || !accountId) {
      showNotification({
        title: "Error",
        message: "Please enter a valid amount and connect your wallet",
        variant: "error",
      });
      return;
    }

    try {
      setIsLoading(true);
      const actualAmount = Number(amount) * 100;

      // Check both associations
      const { isAssetAssociated, isUsdcAssociated } =
        await checkTokenAssociation(tokenId);
      if (!isAssetAssociated || !signer) {
        showNotification({
          title: "Error",
          message: `Token not associated. Please try again.`,
          variant: "error",
        });
        return;
      }
      if (tradingPair === "USDC" && !isUsdcAssociated) {
        showNotification({
          title: "Error",
          message: `USDC token not associated. Please try again.`,
          variant: "error",
        });
        return;
      }

      // Check if user has enough tokens to sell
      const tokenBalance = await getTokenBalanceByTokenId(tokenId, accountId);
      if (Number(tokenBalance) < actualAmount) {
        showNotification({
          title: "Error",
          message: `Insufficient ${tokenSymbol} balance. You need ${amount} ${tokenSymbol}`,
          variant: "error",
        });
        return;
      }

      const totalValueinHBAR = totalValue * 5;
      const { status } = await sellAssetToken(
        tokenId,
        accountId,
        actualAmount,
        signer,
        totalValueinHBAR
      );
      if (status === "SUCCESS") {
        await saveOrder({
          token_id: tokenId,
          amount: actualAmount,
          price: currentPrice,
          order_type: "sell",
          status: "pending",
          buyer_id: accountId,
        });
        await saveTrade({
          token_id: tokenId,
          price: currentPrice,
          volume: actualAmount,
          trade_type: "sell",
          trader_id: accountId,
        });
        const newPrice = await updateTokenPrice(
          tokenId,
          currentPrice,
          actualAmount,
          "sell"
        );
        showNotification({
          title: "Success",
          message: `Sell order placed for ${amount} ${tokenSymbol} tokens for ${
            tradingPair === "HBAR" ? "ℏ" : "$"
          }${totalValueinHBAR.toFixed(4)}`,
        });
      }
    } catch (error: any) {
      console.error("Sell order error:", error);
      showNotification({
        title: "Error",
        message: error.message || "Failed to place sell order",
        variant: "error",
      });
    } finally {
      setAmount("");
      setIsLoading(false);
    }
  };

  const totalValue =
    Number(amount) *
    (orderType === "market" ? tokenomics.pricePerTokenUSD : Number(price));
  const priceChange =
    chartData.length > 1
      ? ((chartData[chartData.length - 1].close - chartData[0].open) /
          chartData[0].open) *
        100
      : 0;

  return (
    <div className="space-y-4">
      {/* Controls first */}
      <Card className="bg-gray-900 border-gray-800 text-white">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTradingPair("HBAR")}
                  className={`${
                    tradingPair === "HBAR" ? "bg-gray-700" : "hover:bg-gray-800"
                  }`}
                >
                  {tokenSymbol}/HBAR
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTradingPair("USDC")}
                  className={`${
                    tradingPair === "USDC" ? "bg-gray-700" : "hover:bg-gray-800"
                  }`}
                >
                  {tokenSymbol}/USDC
                </Button>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-bold text-white">
                  {tradingPair === "HBAR" ? "ℏ" : "$"}
                  {(tradingPair === "HBAR"
                    ? tokenomics.pricePerTokenUSD * 5 // Simulated HBAR price
                    : tokenomics.pricePerTokenUSD
                  ).toFixed(4)}
                </span>
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    priceChange >= 0
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {priceChange >= 0 ? "+" : ""}
                  {priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Tabs
                value={orderType}
                onValueChange={(v) => setOrderType(v as "market" | "limit")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                  <TabsTrigger
                    value="market"
                    className="data-[state=active]:bg-gray-700"
                  >
                    Market
                  </TabsTrigger>
                  <TabsTrigger
                    value="limit"
                    className="data-[state=active]:bg-gray-700"
                  >
                    Limit
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="market" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Amount</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="limit" className="space-y-3 mt-3">
                  <LimitOrder
                    tokenId={tokenId}
                    tokenSymbol={tokenSymbol}
                    currentPrice={currentPrice}
                    tokenomics={tokenomics}
                    tradingPair={tradingPair}
                  />
                </TabsContent>
              </Tabs>

              {amount && Number(amount) > 0 && (
                <div className="text-xs text-gray-400">
                  Total: {tradingPair === "HBAR" ? "ℏ" : "$"}
                  {(tradingPair === "HBAR"
                    ? totalValue * 5 // Simulated HBAR total
                    : totalValue
                  ).toFixed(2)}
                </div>
              )}

              {orderType === "market" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white font-medium"
                    onClick={handleBuy}
                    disabled={
                      !amount ||
                      Number(amount) <= 0 ||
                      isLoading ||
                      isCheckingAssociation
                    }
                  >
                    {isLoading
                      ? "Processing..."
                      : isCheckingAssociation
                      ? "Checking..."
                      : "Buy"}
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white font-medium"
                    onClick={handleSell}
                    disabled={
                      !amount ||
                      Number(amount) <= 0 ||
                      isLoading ||
                      isCheckingAssociation
                    }
                  >
                    {isLoading
                      ? "Processing..."
                      : isCheckingAssociation
                      ? "Checking..."
                      : "Sell"}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-gray-400 uppercase">
                Order Book
              </h3>
              <div className="bg-gray-950 rounded p-2 space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 pb-1 border-b border-gray-800">
                  <span>Price</span>
                  <span>Amount</span>
                  <span>Total</span>
                </div>
                {/* Asks (Sell orders) */}
                {orderBook.asks
                  .slice(0, 4)
                  .reverse()
                  .map((ask: any, i: number) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 gap-2 text-xs text-red-400"
                    >
                      <span>{ask.price}</span>
                      <span>{ask.amount.toLocaleString()}</span>
                      <span>{(ask.price * ask.amount).toLocaleString()}</span>
                    </div>
                  ))}
                {/* Current price */}
                <div className="text-center py-1 text-sm font-bold border-y border-gray-800">
                  {tradingPair === "HBAR" ? "ℏ" : "$"}
                  {(tradingPair === "HBAR"
                    ? tokenomics.pricePerTokenUSD * 5 // Simulated HBAR price
                    : tokenomics.pricePerTokenUSD
                  ).toFixed(4)}
                </div>
                {/* Bids (Buy orders) */}
                {orderBook.bids.slice(0, 4).map((bid: any, i: number) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 gap-2 text-xs text-green-400"
                  >
                    <span>{bid.price}</span>
                    <span>{bid.amount.toLocaleString()}</span>
                    <span>{(bid.price * bid.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-800">
            <div className="space-y-1">
              <div className="text-xs text-gray-400">24h Volume</div>
              <div className="text-sm font-medium">
                {(Math.random() * 1000000).toFixed(0)} {tokenSymbol}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Market Cap</div>
              <div className="text-sm font-medium">
                ${tokenomics.assetValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Chart below trading controls */}
      <TradingChart
        data={chartData}
        title={`${tokenSymbol}/USDC Price Chart`}
        tokenSymbol={tokenSymbol}
        height={400}
        onPriceChange={handlePriceUpdate}
      />

      {/* Orders section */}
      <Card>
        <Orders orders={orders} tokenSymbol={tokenSymbol} />
      </Card>
    </div>
  );
};
