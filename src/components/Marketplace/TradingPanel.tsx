"use client";

import { useState, useEffect, useContext, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenAssociationManager } from "@/utils/token-association";
import { TokenId } from "@hashgraph/sdk";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  subscribeToPriceUpdates, 
  unsubscribeFromPriceUpdates, 
  getTokenChartData,
  generateOrderBook,
  updateTokenPrice 
} from "@/utils/trading";
import { WalletContext } from "@/contexts/WalletContext";
import { TradingPanelProps } from "@/utils/assets";
import { buyAssetToken, getTokenBalanceByTokenId } from "@/utils/hedera-integration";
import { saveOrder, saveTrade, supabase } from "@/utils/supabase";
import { useNotification } from "@/contexts/notification-context";


export const TradingPanel = ({
  tokenomics,
  tokenSymbol,
  tokenId, // Add this to your TradingPanelProps interface
}: TradingPanelProps) => {
  const { accountId, walletType, evmAddress, signer } =
    useContext(WalletContext);
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>(
    tokenomics.pricePerTokenUSD.toString()
  );
  const [chartData, setChartData] = useState<any[]>([]);
  const [orderBook, setOrderBook] = useState<any>({ asks: [], bids: [] });
  const [currentPrice, setCurrentPrice] = useState<number>(tokenomics.pricePerTokenUSD);

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAssociation, setIsCheckingAssociation] = useState(false);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const { showNotification } = useNotification();
  const [tradingPair, setTradingPair] = useState<"USDC" | "HBAR">("HBAR");

  const handlePriceUpdate = useCallback((newPrice: number) => {
    setCurrentPrice(newPrice);
    getTokenChartData(tokenId, tokenomics.pricePerTokenUSD).then(setChartData);
    const orders = generateOrderBook(newPrice);
    setOrderBook(orders);
  }, [tokenId, tokenomics.pricePerTokenUSD]);
useEffect(() => {
  const getTokenBalance = async () => {
  const tokenBalance = await getTokenBalanceByTokenId(tokenId)
  console.log("Token Balance: ", tokenBalance);
  }
  getTokenBalance();
},[tokenId])
  useEffect(() => {
    // Initialize with current data
    getTokenChartData(tokenId, tokenomics.pricePerTokenUSD).then(setChartData);
    const orders = generateOrderBook(currentPrice);
    setOrderBook(orders);

    // Subscribe to price updates
    subscribeToPriceUpdates(tokenId, handlePriceUpdate, tokenomics.pricePerTokenUSD);

    // Cleanup subscription on unmount
    return () => {
      unsubscribeFromPriceUpdates(tokenId, handlePriceUpdate);
    };
  }, [tokenId, handlePriceUpdate, tokenomics.pricePerTokenUSD, currentPrice]);

  const checkTokenAssociation = async () => {
    if (!accountId || !tokenId) {
      showNotification({
        title: "Error",
        message: "Please connect your wallet first",
        variant: "error",
      });
      return false;
    }

    try {
      setIsCheckingAssociation(true);
      const tokenManager = new TokenAssociationManager();

      const isAssociated = await tokenManager.isTokenAssociated(
        {
          type: walletType === "hedera" ? "hedera" : "evm",
          accountId: accountId ?? undefined,
          provider: walletType === "evm" ? window.ethereum : undefined, // Only for MetaMask
          evmAddress: evmAddress ? evmAddress : undefined,
        },
        TokenId.fromString(tokenId)
      );
      console.log("In checkTokenAssociation, isAssociated:", isAssociated);
      if (!isAssociated) {
        await tokenManager.associateToken(
          {
            type: walletType === "hedera" ? "hedera" : "evm",
            accountId: accountId ?? undefined,
            signer,
            provider: walletType === "evm" ? window.ethereum : undefined, // Only for MetaMask
            evmAddress: evmAddress ? evmAddress : undefined,
            snapEnabled: false,
            network: "testnet",
          },
          TokenId.fromString(tokenId)
        );
        showNotification({
          title: "Success",
          message: `Successfully associated with ${tokenSymbol} token`,
        });
      }
      return isAssociated;
    } catch (error: any) {
      showNotification({
        title: "Error",
        message: error.message || "Failed to check token association",
        variant: "error",
      });
      return false;
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

    try {
      setIsLoading(true);

      // Convert amount to actual tokens (multiply by 100)
      const actualAmount = Number(amount) * 100;
      console.log("Original amount:", amount, "Actual token amount:", actualAmount);

      // Check token association first
      const isAssociated = await checkTokenAssociation();
      console.log(
        "Token is associated, proceeding with buy order...",
        isAssociated
      );
      if (!isAssociated || !signer) {
        return;
      }

      // Calculate the total value in the selected trading pair
      const totalInTradingPair = tradingPair === "HBAR" 
        ? totalValue * 5 // Simulated HBAR conversion
        : totalValue;

      // Save the order first
      console.log(" order Data: ", tokenId, actualAmount, currentPrice, accountId);
      const order = await saveOrder({
        token_id: tokenId,
        amount: actualAmount,
        price: currentPrice,
        order_type: 'buy', 
        status: 'pending',
        buyer_id: accountId
      });

      console.log("Order saved:", order);

      // Execute the buy order using buyAssetToken
      const { status } = await buyAssetToken(
        tokenId,
        accountId,
        actualAmount,
        signer,
        {
          tradingPair,
          value: totalInTradingPair,
          pricePerToken: tradingPair === "HBAR" 
            ? tokenomics.pricePerTokenUSD * 5 
            : tokenomics.pricePerTokenUSD
        }
      );
      
      console.log("Buy order status:", status);
      if (status === "SUCCESS") {
        // Update order status to completed
        alert("Purchase successful!");
        await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('id', order.id);

        // Save to trade history
        await saveTrade({
          token_id: tokenId,
          price: currentPrice,
          volume: actualAmount,
          trade_type: 'buy',
          trader_id: accountId
        });

        // Update token price
        const newPrice = await updateTokenPrice(tokenId, currentPrice, actualAmount, 'buy');
        console.log('New token price:', newPrice);

        showNotification({
          title: "Success",
          message: `Successfully purchased ${amount} ${tokenSymbol} tokens for ${tradingPair === "HBAR" ? "ℏ" : "$"}${totalInTradingPair.toFixed(4)}`,
        });
      } else {
        // Update order status to failed
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', order.id);

        throw new Error(`Transaction failed with status: ${status}`);
      }
    } catch (error: any) {
      console.error("Buy order error:", error);
      showNotification({
        title: "Error",
        message: error.message || "Failed to place buy order",
        variant: "error",
      });
    } finally {
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

      // Convert amount to actual tokens (multiply by 100)
      const actualAmount = Number(amount) * 100;
      console.log("Original amount:", amount, "Actual token amount:", actualAmount);

      // Check token association first
      const isAssociated = await checkTokenAssociation();
      if (!isAssociated || !signer) {
        return;
      }

      // Calculate the total value in the selected trading pair
      const totalInTradingPair = tradingPair === "HBAR" 
        ? totalValue * 5 // Simulated HBAR conversion
        : totalValue;

      // Save the order first
      const order = await saveOrder({
        token_id: tokenId,
        amount: actualAmount,
        price: currentPrice,
        order_type: 'sell',
        status: 'pending',
        buyer_id: accountId
      });

      console.log("Order saved:", order);

      // Proceed with sell order
      // TODO: Implement sellAssetToken function in hedera-integration.ts
      const status = "SUCCESS"; // Temporary until sellAssetToken is implemented
      
      if (status === "SUCCESS") {
        // Update order status to completed
        await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('id', order.id);

        // Save to trade history
        await saveTrade({
          token_id: tokenId,
          price: currentPrice,
          volume: actualAmount,
          trade_type: 'sell',
          trader_id: accountId
        });

        // Update token price
        const newPrice = await updateTokenPrice(tokenId, currentPrice, actualAmount, 'sell');
        console.log('New token price:', newPrice);

        showNotification({
          title: "Success",
          message: `Sell order placed for ${amount} ${tokenSymbol} tokens for ${tradingPair === "HBAR" ? "ℏ" : "$"}${totalInTradingPair.toFixed(4)}`,
        });
      } else {
        // Update order status to failed
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', order.id);

        throw new Error(`Transaction failed with status: ${status}`);
      }
    } catch (error: any) {
      console.error("Sell order error:", error);
      showNotification({
        title: "Error",
        message: error.message || "Failed to place sell order",
        variant: "error",
      });
    } finally {
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
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Price</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.0000"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
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
      <Card className="bg-gray-900 border-gray-800 text-white">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Price Chart
          </h3>
          <div className="h-64 w-full bg-gray-950 rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={{ stroke: "#374151" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={{ stroke: "#374151" }}
                  domain={["dataMin - 0.001", "dataMax + 0.001"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    color: "#fff",
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(4)}`,
                    name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                />
                <Bar dataKey="volume" fill="#374151" opacity={0.3} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={priceChange >= 0 ? "#10B981" : "#EF4444"}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
};
