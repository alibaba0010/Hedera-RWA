"use client";

import { useState, useEffect, useContext } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast, useToast } from "@/components/ui/use-toast";
import { TokenAssociationManager } from "@/utils/token-association";
import { Client, AccountId, TokenId } from "@hashgraph/sdk";
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
import { WalletContext } from "@/contexts/WalletContext";
import { TradingPanelProps } from "@/utils/assets";

const generateCandlestickData = (currentPrice: number) => {
  const data = [];
  let price = currentPrice * 0.9;

  for (let i = 0; i < 24; i++) {
    const open = price;
    const variation = (Math.random() - 0.5) * 0.05;
    const close = open + open * variation;
    const high =
      Math.max(open, close) + Math.abs(open * (Math.random() * 0.02));
    const low = Math.min(open, close) - Math.abs(open * (Math.random() * 0.02));
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      time: `${String(i).padStart(2, "0")}:00`,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
      volume,
      price: Number(close.toFixed(4)),
    });

    price = close;
  }

  return data;
};

const generateOrderBook = (currentPrice: number) => {
  const asks = [];
  const bids = [];

  for (let i = 0; i < 8; i++) {
    asks.push({
      price: Number((currentPrice + (i + 1) * 0.001).toFixed(4)),
      amount: Math.floor(Math.random() * 10000) + 1000,
      total: 0,
    });

    bids.push({
      price: Number((currentPrice - (i + 1) * 0.001).toFixed(4)),
      amount: Math.floor(Math.random() * 10000) + 1000,
      total: 0,
    });
  }

  return { asks, bids };
};

export const TradingPanel = ({
  tokenomics,
  tokenSymbol,
  tokenId, // Add this to your TradingPanelProps interface
}: TradingPanelProps) => {
  const { accountId, walletType, walletData } = useContext(WalletContext); // wallettype is hedera/evm
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>(
    tokenomics.pricePerTokenUSD.toString()
  );
  const [chartData, setChartData] = useState<any[]>([]);
  const [orderBook, setOrderBook] = useState<any>({ asks: [], bids: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAssociation, setIsCheckingAssociation] = useState(false);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  useEffect(() => {
    const data = generateCandlestickData(tokenomics.pricePerTokenUSD);
    const orders = generateOrderBook(tokenomics.pricePerTokenUSD);
    setChartData(data);
    setOrderBook(orders);
  }, [tokenomics.pricePerTokenUSD]);

  const checkTokenAssociation = async () => {
    if (!accountId || !tokenId) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return false;
    }

    try {
      setIsCheckingAssociation(true);
      const client = Client.forTestnet(); // or forMainnet() based on your environment
      const tokenManager = new TokenAssociationManager(client);

      const isAssociated = await tokenManager.isTokenAssociated(
        {
          type: walletType === "hedera" ? "hashpack" : "metamask",
          accountId: accountId,
          accountKey: walletData?.privateKey, // Only for HashPack
          provider: walletType === "evm" ? window.ethereum : undefined, // Only for MetaMask
        },
        TokenId.fromString(tokenId)
      );

      if (!isAssociated) {
        const shouldAssociate = window.confirm(
          `This token needs to be associated with your wallet first. Would you like to associate it now?`
        );

        if (shouldAssociate) {
          await tokenManager.associateToken(
            {
              type: walletType === "hedera" ? "hashpack" : "metamask",
              accountId: accountId,
              accountKey: walletData?.privateKey,
              provider: walletType === "evm" ? window.ethereum : undefined,
            },
            TokenId.fromString(tokenId)
          );
          toast({
            title: "Success",
            description: "Token successfully associated with your wallet",
          });
          return true;
        }
        return false;
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check token association",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsCheckingAssociation(false);
    }
  };

  const handleBuy = async () => {
    if (!amount || Number(amount) <= 0) return;

    try {
      setIsLoading(true);

      // Check token association first
      const isAssociated = await checkTokenAssociation();
      if (!isAssociated) {
        return;
      }

      // Proceed with buy order
      // Your buy order implementation here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Success",
        description: `Buy order placed for ${amount} ${tokenSymbol} tokens`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place buy order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSell = async () => {
    if (!amount || Number(amount) <= 0) return;

    try {
      setIsLoading(true);

      // Check token association first
      const isAssociated = await checkTokenAssociation();
      if (!isAssociated) {
        return;
      }

      // Proceed with sell order
      // Your sell order implementation here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Success",
        description: `Sell order placed for ${amount} ${tokenSymbol} tokens`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place sell order",
        variant: "destructive",
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
            <div>
              <h2 className="text-lg font-bold text-white">
                {tokenSymbol}/USD
              </h2>
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-bold text-white">
                  ${tokenomics.pricePerTokenUSD.toFixed(4)}
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
                  Total: ${totalValue.toFixed(2)}
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
                  ${tokenomics.pricePerTokenUSD.toFixed(4)}
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
