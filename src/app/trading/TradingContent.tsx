"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

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
  const [selectedAsset, setSelectedAsset] = useState("manhattan-apt");
  const [orderType, setOrderType] = useState("limit");
  const [side, setSide] = useState("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

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
            <SelectItem value="manhattan-apt">
              Manhattan Luxury Apartment
            </SelectItem>
            <SelectItem value="miami-condo">Miami Beach Condo</SelectItem>
            <SelectItem value="austin-complex">
              Austin Residential Complex
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Book */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Order Book</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Asks */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Price</span>
                  <span>Quantity</span>
                  <span>Total</span>
                </div>
                <div className="space-y-1">
                  {orderBook.asks.reverse().map((ask, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm text-red-600"
                    >
                      <span>${ask.price}</span>
                      <span>{ask.quantity}</span>
                      <span>${ask.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spread */}
              <div className="border-t border-b py-2 text-center">
                <span className="text-lg font-bold">$248.75</span>
                <span className="text-xs text-muted-foreground ml-2">
                  Last Price
                </span>
              </div>

              {/* Bids */}
              <div>
                <div className="space-y-1">
                  {orderBook.bids.map((bid, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm text-green-600"
                    >
                      <span>${bid.price}</span>
                      <span>{bid.quantity}</span>
                      <span>${bid.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Interface */}
        <Card className="lg:col-span-1">
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
                          : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Available Balance:</span>
                      <span>1,234.56 HBAR</span>
                    </div>
                  </div>

                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Place Buy Order
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

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Value:</span>
                      <span className="font-medium">
                        $
                        {price && quantity
                          ? (
                              Number.parseFloat(price) *
                              Number.parseFloat(quantity)
                            ).toFixed(2)
                          : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Available Tokens:</span>
                      <span>2,500 tokens</span>
                    </div>
                  </div>

                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Place Sell Order
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Price</span>
                <span>Quantity</span>
                <span>Time</span>
              </div>
              {recentTrades.map((trade, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span
                    className={
                      trade.type === "buy" ? "text-green-600" : "text-red-600"
                    }
                  >
                    ${trade.price}
                  </span>
                  <span>{trade.quantity}</span>
                  <span className="text-muted-foreground">{trade.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
                {myOrders.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="py-3">
                      <Badge
                        variant={
                          order.type === "buy" ? "default" : "destructive"
                        }
                      >
                        {order.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3">${order.price}</td>
                    <td className="py-3">{order.quantity}</td>
                    <td className="py-3">{order.filled}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          order.status === "filled"
                            ? "default"
                            : order.status === "partial"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{order.time}</td>
                    <td className="py-3">
                      {order.status !== "filled" && (
                        <Button variant="outline" size="sm">
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
