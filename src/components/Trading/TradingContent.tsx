"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  subscribeToPriceUpdates,
  unsubscribeFromPriceUpdates,
  getTokenChartData,
  generateOrderBook,
  updateTokenPrice,
} from "@/utils/trading";
import { supabase, fetchDataFromDatabase, saveOrder } from "@/utils/supabase";
import { fetchAssetMetadataFromIPFS } from "@/utils/hedera-integration";
import { TradingChart } from "./TradingChart";
import { WalletContext } from "@/contexts/WalletContext";
import { useContext } from "react";
import { TokenAssociationManager } from "@/utils/token-association";
import { TokenId } from "@hashgraph/sdk";
import { usdcTokenId } from "@/utils/index";

const orderBook = {
  bids: [
    { price: 248.5, quantity: 150, total: 37275 },
    { price: 248.25, quantity: 200, total: 49650 },
    { price: 248.0, quantity: 300, total: 74400 },
    { price: 247.75, quantity: 250, total: 61937.5 },
    { price: 247.5, quantity: 180, total: 44550 },
  ],
  asks: [
    { price: 249.0, quantity: 120, total: 29880 },
    { price: 249.25, quantity: 180, total: 44865 },
    { price: 249.5, quantity: 220, total: 54890 },
    { price: 249.75, quantity: 160, total: 39960 },
    { price: 250.0, quantity: 300, total: 75000 },
  ],
};

const recentTrades = [
  { price: 248.75, quantity: 50, time: "14:32:15", type: "buy" },
  { price: 248.5, quantity: 75, time: "14:31:42", type: "sell" },
  { price: 248.8, quantity: 100, time: "14:30:18", type: "buy" },
  { price: 248.25, quantity: 25, time: "14:29:55", type: "sell" },
  { price: 248.9, quantity: 150, time: "14:28:33", type: "buy" },
];

const myOrders = [
  {
    id: 1,
    type: "buy",
    price: 247.0,
    quantity: 100,
    filled: 0,
    status: "open",
    time: "2024-01-15 10:30",
  },
  {
    id: 2,
    type: "sell",
    price: 252.0,
    quantity: 50,
    filled: 25,
    status: "partial",
    time: "2024-01-15 09:15",
  },
  {
    id: 3,
    type: "buy",
    price: 245.5,
    quantity: 200,
    filled: 200,
    status: "filled",
    time: "2024-01-14 16:45",
  },
];

export function TradingContent() {
  const { accountId, signer } = useContext(WalletContext);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [orderType, setOrderType] = useState("limit");
  const [side, setSide] = useState("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [chartData, setChartData] = useState<any[]>([]);
  const [liveOrderBook, setLiveOrderBook] = useState<any>({
    asks: [],
    bids: [],
  });
  const [liveTrades, setLiveTrades] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // assets will be populated from Supabase/asset_metadata and enriched with IPFS metadata
  const selectedAssetMeta =
    assets.find((a) => a.tokenId === selectedAsset) || assets[0] || null;

  // Load available assets (metadataCID + tokenId) from Supabase and fetch IPFS metadata
  useEffect(() => {
    let isMounted = true;

    const loadAssets = async () => {
      try {
        const rows: any[] = await fetchDataFromDatabase();
        // rows expected to contain { metadataCID, tokenId, owner, created_at }
        const enriched: any[] = [];

        for (const row of rows || []) {
          try {
            const metadata = await fetchAssetMetadataFromIPFS(row.metadataCID);
            enriched.push({
              tokenId: row.tokenId,
              metadataCID: row.metadataCID,
              name: metadata.name,
              symbol:
                metadata?.tokenConfig?.symbol ||
                metadata?.symbol ||
                row.tokenId,
              initialPrice:
                metadata?.tokenomics?.pricePerTokenUSD || metadata?.price || 0,
              rawMetadata: metadata,
            });
          } catch (err) {
            console.warn("Failed to fetch metadata for", row.metadataCID, err);
            enriched.push({
              tokenId: row.tokenId,
              metadataCID: row.metadataCID,
              name: row.metadataCID,
              symbol: row.tokenId,
              initialPrice: 0,
              rawMetadata: null,
            });
          }
        }

        if (!isMounted) return;
        setAssets(enriched);
        if (enriched.length > 0 && !selectedAsset) {
          setSelectedAsset(enriched[0].tokenId);
        }
      } catch (err) {
        console.error("Failed to load assets from database:", err);
      }
    };

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchRecentTrades = useCallback(async (tokenId: string) => {
    try {
      const { data } = await supabase
        .from("trade_history")
        .select("price,volume,created_at,trade_type")
        .eq("token_id", tokenId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        const mapped = data.map((t: any) => ({
          price: Number(t.price),
          quantity: Number(t.volume),
          time: new Date(t.created_at).toLocaleTimeString(),
          type: t.trade_type || "trade",
        }));
        setLiveTrades(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch recent trades:", e);
    }
  }, []);

  const transformChartPoints = (points: any[]) => {
    // Ensure time is a unix seconds number for our chart utils compatibility
    return points.map((point: any) => {
      let timeSec = 0;
      if (typeof point.time === "number") timeSec = point.time;
      else {
        const parsed = Date.parse(point.time);
        timeSec = Number.isNaN(parsed)
          ? Math.floor(Date.now() / 1000)
          : Math.floor(parsed / 1000);
      }

      return {
        time: timeSec,
        open: Number(point.price),
        high: Number((point.price * (1 + Math.random() * 0.02)).toFixed(8)),
        low: Number((point.price * (1 - Math.random() * 0.02)).toFixed(8)),
        close: Number(point.price),
        volume: point.volume || 0,
      };
    });
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        if (!selectedAssetMeta) return;
        const tokenId = selectedAssetMeta.tokenId;

        // Get historical/chart data
        const data = await getTokenChartData(
          tokenId,
          selectedAssetMeta.initialPrice,
        );
        if (!isMounted) return;
        setChartData(transformChartPoints(data));

        // initial order book and trades
        setLiveOrderBook(generateOrderBook(selectedAssetMeta.initialPrice));
        await fetchRecentTrades(tokenId);

        // Subscribe to realtime price updates
        subscribeToPriceUpdates(
          tokenId,
          (price: number) => {
            if (!isMounted) return;
            setCurrentPrice(price);

            // Keep chart data in sync: merge the new price into the current candle
            // or start a new 1-minute candle
            setChartData((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              const nowSec = Math.floor(Date.now() / 1000);
              const CANDLE_WINDOW_SEC = 60;

              if (
                !last ||
                nowSec - (last.time as number) >= CANDLE_WINDOW_SEC
              ) {
                const open = last ? last.close : price;
                next.push({
                  time: nowSec,
                  open,
                  high: Math.max(open, price),
                  low: Math.min(open, price),
                  close: price,
                  volume: 0,
                });
              } else {
                const updated = { ...last };
                updated.close = price;
                updated.high = Math.max(updated.high, price);
                updated.low = Math.min(updated.low, price);
                next[next.length - 1] = updated;
              }

              return next.slice(-200);
            });

            // update order book
            setLiveOrderBook(generateOrderBook(price));

            // fetch recent trades (best-effort)
            fetchRecentTrades(tokenId).catch(console.error);
          },
          selectedAssetMeta.initialPrice,
        );
      } catch (error) {
        console.error("Error initializing trading content:", error);
      }
    };

    init();

    return () => {
      isMounted = false;
      try {
        if (selectedAssetMeta?.tokenId) {
          unsubscribeFromPriceUpdates(
            selectedAssetMeta.tokenId,
            (price: number) => {},
          );
        }
      } catch (e) {
        // ignore
      }
    };
  }, [selectedAsset, selectedAssetMeta, fetchRecentTrades]);

  // Fetch orders for selected asset from Supabase and subscribe to realtime updates
  useEffect(() => {
    let isMounted = true;
    if (!selectedAssetMeta?.tokenId) return;

    const tokenId = selectedAssetMeta.tokenId;

    const fetchOrders = async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("token_id", tokenId)
          .order("created_at", { ascending: false });

        if (!isMounted) return;
        setOrders(data || []);
      } catch (e) {
        console.error("Failed to fetch orders:", e);
      }
    };

    fetchOrders();

    const channel = supabase
      .channel(`orders_${tokenId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `token_id=eq.${tokenId}`,
        },
        () => {
          // refresh on any change
          fetchOrders().catch(console.error);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, [selectedAssetMeta]);

  const cancelOrder = async (orderId: string | number) => {
    try {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      // optimistic refresh
      if (selectedAssetMeta?.tokenId) {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("token_id", selectedAssetMeta.tokenId)
          .order("created_at", { ascending: false });
        setOrders(data || []);
      }
    } catch (e) {
      console.error("Failed to cancel order:", e);
    }
  };

  /**
   * Core buy/sell handler.
   * 1. Validates inputs.
   * 2. Saves a pending order row.
   * 3. Calls updateTokenPrice() which:
   *    a. inserts into trade_history (triggers Supabase realtime → chart auto-updates)
   *    b. immediately notifies all in-memory price listeners
   * 4. Saves a trade_history record and marks order as completed.
   */
  const placeOrder = async () => {
    setOrderError(null);
    setOrderSuccess(null);

    if (!selectedAssetMeta) {
      setOrderError("No asset selected.");
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setOrderError("Please enter a valid quantity.");
      return;
    }

    const resolvedPrice =
      orderType === "market"
        ? (currentPrice ?? selectedAssetMeta.initialPrice)
        : Number(price);

    if (!resolvedPrice || resolvedPrice <= 0) {
      setOrderError("Please enter a valid price.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tokenId = selectedAssetMeta.tokenId;
      const prevPrice = currentPrice ?? selectedAssetMeta.initialPrice;

      // --- Token Association Check ---
      const tokenManager = new TokenAssociationManager();
      const wallet = {
        type: "hedera" as const,
        accountId: accountId!,
        signer:
          (window as any).signer || (window as any).dAppConnector?.signers[0], // fallback or context signer
      };

      // Check if user is associated
      const isAssociated = await tokenManager.isTokenAssociated(
        wallet as any,
        tokenId,
      );

      if (!isAssociated) {
        setOrderSuccess("Associating token with your wallet...");
        try {
          await tokenManager.associateToken(wallet as any, tokenId);
        } catch (assocErr: any) {
          throw new Error(`Failed to associate token: ${assocErr.message}`);
        }
      }
      // -------------------------------

      // Save the order to Supabase
      let savedOrder: any = null;
      try {
        savedOrder = await saveOrder({
          token_id: tokenId,
          amount: qty * 100, // stored in minor units (×100)
          price: resolvedPrice,
          order_type: side as "buy" | "sell",
          status: "pending",
          buyer_id: accountId || "anonymous",
          target_price: orderType === "limit" ? resolvedPrice : null,
        });
      } catch (err) {
        // Non-fatal: proceed even if order row fails
        console.warn("Could not save order row:", err);
      }

      // Calculate new price and broadcast update
      const newPrice = await updateTokenPrice(
        tokenId,
        prevPrice,
        qty,
        side as "buy" | "sell",
        accountId || "anonymous",
      );

      // Immediately reflect new price in the UI
      setCurrentPrice(newPrice);

      // Mark order as completed
      if (savedOrder?.id) {
        try {
          await supabase
            .from("orders")
            .update({ status: "completed", filled: qty })
            .eq("id", savedOrder.id);
        } catch (err) {
          console.warn("Could not update order status:", err);
        }
      }

      const direction = side === "buy" ? "📈" : "📉";
      setOrderSuccess(
        `${direction} Order filled! ${qty} tokens at $${newPrice.toFixed(4)} (was $${prevPrice.toFixed(4)})`,
      );

      // Reset form
      setQuantity("");
      if (orderType === "limit") setPrice("");
    } catch (err: any) {
      console.error("placeOrder error:", err);
      setOrderError(err?.message || "Order failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading</h1>
          <p className="text-muted-foreground mt-2">
            Buy and sell real estate tokens on the secondary market
          </p>
        </div>

        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assets && assets.length > 0 ? (
              assets.map((a) => (
                <SelectItem key={a.tokenId} value={a.tokenId}>
                  {a.name || a.symbol || a.tokenId}
                </SelectItem>
              ))
            ) : (
              <>
                <SelectItem value="manhattan-apt">
                  Manhattan Luxury Apartment
                </SelectItem>
                <SelectItem value="miami-condo">Miami Beach Condo</SelectItem>
                <SelectItem value="austin-complex">
                  Austin Residential Complex
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chart Section */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {selectedAssetMeta?.name || "Select Asset"}
                  </CardTitle>
                  {selectedAssetMeta && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {selectedAssetMeta.symbol}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedAssetMeta.tokenId}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    $
                    {(
                      currentPrice ??
                      selectedAssetMeta?.initialPrice ??
                      0
                    ).toFixed(4)}
                  </div>
                  <div className="text-xs text-green-600">+2.4% (24h)</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <TradingChart
                data={chartData}
                tokenSymbol={selectedAssetMeta?.symbol || "TOKEN"}
                title={`${selectedAssetMeta?.name || "Asset"} Price`}
                height={500}
              />
            </CardContent>
          </Card>

          {/* My Orders Moved Here for better flow in 3-column layout */}
          <Card>
            <CardHeader>
              <CardTitle>My Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Price</th>
                      <th className="text-left py-2">Quantity</th>
                      <th className="text-left py-2">Filled</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders && orders.length > 0 ? (
                      orders.map((order: any) => (
                        <tr key={order.id} className="border-b">
                          <td className="py-3">
                            <Badge
                              variant={
                                order.order_type === "buy"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {String(order.order_type || "").toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3">
                            ${Number(order.price).toFixed(4)}
                          </td>
                          <td className="py-3">{(order.amount || 0) / 100}</td>
                          <td className="py-3">{order.filled || 0}</td>
                          <td className="py-3">
                            <Badge
                              variant={
                                order.status === "completed"
                                  ? "default"
                                  : order.status === "pending"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {String(order.status || "").toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleString()
                              : "-"}
                          </td>
                          <td className="py-3">
                            {order.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelOrder(order.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-4 text-center text-muted-foreground"
                        >
                          No orders for selected asset.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Order Book & Trading Interface */}
        <div className="lg:col-span-1 space-y-6">
          {/* Trading Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Place Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Tabs value={side} onValueChange={setSide}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buy" className="text-green-600">
                      Buy
                    </TabsTrigger>
                    <TabsTrigger value="sell" className="text-red-600">
                      Sell
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="buy" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Order Type</Label>
                      <Select value={orderType} onValueChange={setOrderType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limit">Limit Order</SelectItem>
                          <SelectItem value="market">Market Order</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {orderType === "limit" && (
                      <div className="space-y-2">
                        <Label>Price per Token</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Cost:</span>
                        <span className="font-medium">
                          $
                          {price && quantity
                            ? (
                                Number.parseFloat(price) *
                                Number.parseFloat(quantity)
                              ).toFixed(2)
                            : orderType === "market" && quantity
                              ? (
                                  (currentPrice ??
                                    selectedAssetMeta?.initialPrice ??
                                    0) * Number.parseFloat(quantity)
                                ).toFixed(2)
                              : "0.00"}
                        </span>
                      </div>
                    </div>

                    {orderError && side === "buy" && (
                      <p className="text-xs text-red-500">{orderError}</p>
                    )}
                    {orderSuccess && side === "buy" && (
                      <p className="text-xs text-green-600">{orderSuccess}</p>
                    )}

                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={placeOrder}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Placing…" : "Place Buy Order"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="sell" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Order Type</Label>
                      <Select value={orderType} onValueChange={setOrderType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limit">Limit Order</SelectItem>
                          <SelectItem value="market">Market Order</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {orderType === "limit" && (
                      <div className="space-y-2">
                        <Label>Price per Token</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>

                    {orderError && side === "sell" && (
                      <p className="text-xs text-red-500">{orderError}</p>
                    )}
                    {orderSuccess && side === "sell" && (
                      <p className="text-xs text-green-600">{orderSuccess}</p>
                    )}

                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={placeOrder}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Placing…" : "Place Sell Order"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Order Book */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Book</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Asks */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Price</span>
                    <span>Qty</span>
                  </div>
                  <div className="space-y-1">
                    {(liveOrderBook.asks && liveOrderBook.asks.length > 0
                      ? liveOrderBook.asks.slice(0, 5).reverse()
                      : orderBook.asks.slice(0, 5).reverse()
                    ).map((ask: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between text-sm text-red-600"
                      >
                        <span>${ask.price}</span>
                        <span>{ask.amount || ask.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last Price */}
                <div className="border-y py-2 text-center bg-muted/30">
                  <span className="text-lg font-bold">
                    $
                    {(
                      currentPrice ??
                      selectedAssetMeta?.initialPrice ??
                      0
                    ).toFixed(4)}
                  </span>
                </div>

                {/* Bids */}
                <div>
                  <div className="space-y-1">
                    {(liveOrderBook.bids && liveOrderBook.bids.length > 0
                      ? liveOrderBook.bids.slice(0, 5)
                      : orderBook.bids.slice(0, 5)
                    ).map((bid: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between text-sm text-green-600"
                      >
                        <span>${bid.price}</span>
                        <span>{bid.amount || bid.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Price</span>
                  <span>Qty</span>
                  <span>Time</span>
                </div>
                {(liveTrades && liveTrades.length > 0
                  ? liveTrades
                  : recentTrades
                )
                  .slice(0, 8)
                  .map((trade, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span
                        className={
                          trade.type === "buy"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        ${trade.price}
                      </span>
                      <span>{trade.quantity}</span>
                      <span className="text-muted-foreground">
                        {trade.time}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Orders */}
      <Card>
        <CardHeader>
          <CardTitle>My Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Price</th>
                  <th className="text-left py-2">Quantity</th>
                  <th className="text-left py-2">Filled</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders && orders.length > 0 ? (
                  orders.map((order: any) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3">
                        <Badge
                          variant={
                            order.order_type === "buy"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {String(order.order_type || "").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3">
                        ${Number(order.price).toFixed(4)}
                      </td>
                      <td className="py-3">{(order.amount || 0) / 100}</td>
                      <td className="py-3">{order.filled || 0}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            order.status === "completed"
                              ? "default"
                              : order.status === "pending"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {String(order.status || "").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="py-3">
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelOrder(order.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-4 text-center text-muted-foreground"
                    >
                      No orders for selected asset.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
