"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Order {
  id: string;
  token_id: string;
  amount: number;
  price: number;
  order_type: "buy" | "sell";
  status: "pending" | "completed" | "failed";
  buyer_id: string;
  created_at: string;
}

interface OrdersProps {
  orders: Order[];
  tokenSymbol: string;
}

export function Orders({ orders, tokenSymbol }: OrdersProps) {
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredOrders = orders
    .filter((order) => {
      if (filter === "all") return true;
      return order.order_type === filter;
    })
    .filter((order) =>
      order.buyer_id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return sortOrder === "asc"
            ? new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime();
        case "price":
          return sortOrder === "asc" ? a.price - b.price : b.price - a.price;
        case "amount":
          return sortOrder === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        default:
          return 0;
      }
    });

  return (
    <Card className="bg-gray-900 border-gray-800 text-white p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Orders</h3>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search by buyer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white w-64"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-gray-800 border-gray-700"
                >
                  Filter: {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                <DropdownMenuItem onClick={() => setFilter("all")}>
                  All Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("buy")}>
                  Buy Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("sell")}>
                  Sell Orders
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="rounded-md border border-gray-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="text-gray-400 cursor-pointer"
                  onClick={() => {
                    if (sortBy === "date") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("date");
                      setSortOrder("desc");
                    }
                  }}
                >
                  Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="text-gray-400">Type</TableHead>
                <TableHead
                  className="text-gray-400 cursor-pointer"
                  onClick={() => {
                    if (sortBy === "price") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("price");
                      setSortOrder("desc");
                    }
                  }}
                >
                  Price{" "}
                  {sortBy === "price" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="text-gray-400 cursor-pointer"
                  onClick={() => {
                    if (sortBy === "amount") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("amount");
                      setSortOrder("desc");
                    }
                  }}
                >
                  Amount{" "}
                  {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="text-gray-400">Total</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Buyer ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-gray-300">
                    {new Date(order.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        order.order_type === "buy"
                          ? "bg-green-600/20 text-green-400"
                          : "bg-red-600/20 text-red-400"
                      }
                    >
                      {order.order_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    ${order.price.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {order.amount / 100} {tokenSymbol}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    ${((order.price * order.amount)/100).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        order.status === "completed"
                          ? "bg-green-600/20 text-green-400"
                          : order.status === "failed"
                          ? "bg-red-600/20 text-red-400"
                          : "bg-yellow-600/20 text-yellow-400"
                      }
                    >
                      {order.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 font-mono">
                    {order.buyer_id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}
