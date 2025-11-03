"use client";

import { useContext, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WalletContext } from "@/contexts/WalletContext";
import { useNotification } from "@/contexts/notification-context";
import { getTokenBalanceByTokenId } from "@/utils/hedera-integration";
import { TokenAssociationManager } from "@/utils/token-association";
import { TokenId } from "@hashgraph/sdk";
import { usdcTokenId } from "@/utils";
import { updateTokenPrice } from "@/utils/trading";
import { saveOrder, saveTrade } from "@/utils/supabase";
import {
  placeBuyOrderOnHedera,
  placeSellOrderOnHedera,
  finalizeBuyOrder,
  finalizeSellOrder,
} from "@/utils/order-hedera-integration";

interface LimitOrderProps {
  tokenId: string;
  tokenSymbol: string;
  currentPrice: number;
  tokenomics: any;
  tradingPair: "HBAR" | "USDC";
}

export const LimitOrder = ({
  tokenId,
  tokenSymbol,
  currentPrice,
  tokenomics,
  tradingPair,
}: LimitOrderProps) => {
  const { accountId, walletType, evmAddress, signer } =
    useContext(WalletContext);
  // tokenomics prop intentionally unused for now — keep reference to avoid unused-var warnings
  void tokenomics;
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAssociation, setIsCheckingAssociation] = useState(false);
  const { showNotification } = useNotification();
  const [limitOrders, setLimitOrders] = useState<any[]>([]);

  const checkTokenAssociation = async (tokenId: string) => {
    setIsCheckingAssociation(true);
    try {
      const tokenManager = new TokenAssociationManager();
      if (!accountId)
        return { isAssetAssociated: false, isUsdcAssociated: false };

      let isAssetAssociated = await tokenManager.isTokenAssociated(
        {
          type: walletType === "hedera" ? "hedera" : "evm",
          accountId,
          provider: walletType === "evm" ? window.ethereum : undefined,
          evmAddress: evmAddress || undefined,
        },
        TokenId.fromString(tokenId)
      );

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

  const createLimitOrder = async (type: "buy" | "sell") => {
    if (
      !amount ||
      Number(amount) <= 0 ||
      !targetPrice ||
      Number(targetPrice) <= 0 ||
      !accountId
    ) {
      showNotification({
        title: "Error",
        message: "Please enter valid amount and target price",
        variant: "error",
      });
      return;
    }

    try {
      setIsLoading(true);
      const actualAmount = Number(amount) * 100;

      // Check token associations
      const { isAssetAssociated, isUsdcAssociated } =
        await checkTokenAssociation(tokenId);
      if (!isAssetAssociated || !signer) {
        showNotification({
          title: "Error",
          message: "Token not associated. Please try again.",
          variant: "error",
        });
        return;
      }

      if (tradingPair === "USDC" && !isUsdcAssociated) {
        showNotification({
          title: "Error",
          message: "USDC token not associated. Please try again.",
          variant: "error",
        });
        return;
      }

      // Check balances
      if (type === "sell") {
        const tokenBalance = await getTokenBalanceByTokenId(tokenId, accountId);
        if (Number(tokenBalance) < actualAmount) {
          showNotification({
            title: "Error",
            message: `Insufficient ${tokenSymbol} balance`,
            variant: "error",
          });
          return;
        }
      }

      const totalValue = Number(targetPrice) * Number(amount);
      // Calculate total value in trading pair
      const totalInTradingPair =
        tradingPair === "HBAR" ? totalValue * 5 : totalValue;

      let initialStatus;
      // Initial order placement
      if (type === "buy") {
        const result = await placeBuyOrderOnHedera(
          accountId,
          signer,
          tradingPair,
          totalInTradingPair
        );
        initialStatus = result.status;
      } else {
        const result = await placeSellOrderOnHedera(
          tokenId,
          accountId,
          actualAmount,
          signer
        );
        initialStatus = result.status;
      }

      if (initialStatus === "SUCCESS") {
        const newLimitOrder = {
          type,
          amount: actualAmount,
          targetPrice: Number(targetPrice),
          totalValue: totalInTradingPair,
          timestamp: new Date().toISOString(),
          status: "pending",
          accountId,
          tokenId,
          tradingPair,
        };

        setLimitOrders((prev) => [...prev, newLimitOrder]);

        // Store the limit order in your database/storage with pending status
        await saveOrder({
          token_id: tokenId,
          amount: actualAmount,
          price: Number(targetPrice),
          order_type: type,
          status: "pending",
          buyer_id: accountId,
          target_price: Number(targetPrice),
        });

        showNotification({
          title: "Success",
          message: `Limit ${type} order placed successfully and waiting for price match`,
          variant: "success",
        });
      } else {
        throw new Error("Initial order placement failed");
      }

      // Reset form
      setAmount("");
      setTargetPrice("");
    } catch (error: any) {
      console.error("Limit order error:", error);
      showNotification({
        title: "Error",
        message: error.message || `Failed to place limit ${type} order`,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Monitor price and execute limit orders
  useEffect(() => {
    const monitorPrice = async () => {
      for (const order of limitOrders) {
        if (order.status !== "pending") continue;

        const shouldExecute =
          (order.type === "buy" && currentPrice <= order.targetPrice) ||
          (order.type === "sell" && currentPrice >= order.targetPrice);

        if (!shouldExecute) continue;

        try {
          if (!signer) {
            showNotification({
              title: "Error",
              message: "Wallet not connected",
              variant: "error",
            });
            continue;
          }

          // Finalize the order when price matches
          let finalizeStatus;
          if (order.type === "buy") {
            const result = await finalizeBuyOrder(
              order.tokenId,
              order.accountId,
              order.amount
            );
            finalizeStatus = result.status;
          } else {
            const result = await finalizeSellOrder(
              order.accountId,
              order.totalValue
            );
            finalizeStatus = result.status;
          }

          if (finalizeStatus === "SUCCESS") {
            // Update order status to completed
            await saveOrder({
              token_id: order.tokenId,
              amount: order.amount,
              price: order.targetPrice,
              order_type: order.type,
              status: "completed",
              buyer_id: order.accountId,
              target_price: order.targetPrice,
            });

            // Record the trade
            await saveTrade({
              token_id: order.tokenId,
              price: order.targetPrice,
              volume: order.amount,
              trade_type: order.type,
              trader_id: order.accountId,
            });

            // Update token price
            await updateTokenPrice(
              order.tokenId,
              order.targetPrice,
              order.amount,
              order.type
            );

            showNotification({
              title: "Limit Order Executed",
              message: `Successfully ${
                order.type === "buy" ? "bought" : "sold"
              } ${order.amount / 100} ${tokenSymbol} at ${order.targetPrice}`,
              variant: "success",
            });

            // Remove executed order from local state
            setLimitOrders((prev) => prev.filter((o) => o !== order));
          } else {
            // Mark order failed if finalization did not succeed
            await saveOrder({
              token_id: order.tokenId,
              amount: order.amount,
              price: order.targetPrice,
              order_type: order.type,
              status: "failed",
              buyer_id: order.accountId,
              target_price: order.targetPrice,
            });

            showNotification({
              title: "Error",
              message: `Order finalization failed for ${order.type} order`,
              variant: "error",
            });

            setLimitOrders((prev) => prev.filter((o) => o !== order));
          }
        } catch (error: any) {
          console.error("Error finalizing limit order:", error);

          // Mark order failed and remove from local list
          try {
            await saveOrder({
              token_id: order.tokenId,
              amount: order.amount,
              price: order.targetPrice,
              order_type: order.type,
              status: "failed",
              buyer_id: order.accountId,
              target_price: order.targetPrice,
            });
          } catch (e) {
            console.error("Failed to save failed order state:", e);
          }

          showNotification({
            title: "Error",
            message: error.message || "Failed to finalize limit order",
            variant: "error",
          });

          setLimitOrders((prev) => prev.filter((o) => o !== order));
        }
      }
    };

    // Set up interval to monitor price
    const interval = setInterval(() => {
      void monitorPrice();
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [limitOrders, currentPrice, signer]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs text-gray-400">Target Price</Label>
        <Input
          type="number"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
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

      {amount &&
        targetPrice &&
        Number(amount) > 0 &&
        Number(targetPrice) > 0 && (
          <div className="text-xs text-gray-400">
            Total: {tradingPair === "HBAR" ? "ℏ" : "$"}
            {(tradingPair === "HBAR"
              ? Number(amount) * Number(targetPrice) * 5
              : Number(amount) * Number(targetPrice)
            ).toFixed(2)}
          </div>
        )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white font-medium"
          onClick={() => createLimitOrder("buy")}
          disabled={
            !amount || Number(amount) <= 0 || isLoading || isCheckingAssociation
          }
        >
          {isLoading
            ? "Processing..."
            : isCheckingAssociation
            ? "Checking..."
            : "Buy Order"}
        </Button>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white font-medium"
          onClick={() => createLimitOrder("sell")}
          disabled={
            !amount || Number(amount) <= 0 || isLoading || isCheckingAssociation
          }
        >
          {isLoading
            ? "Processing..."
            : isCheckingAssociation
            ? "Checking..."
            : "Sell Order"}
        </Button>
      </div>

      {/* Display active limit orders */}
      {limitOrders.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Active Limit Orders
          </h4>
          <div className="space-y-2">
            {limitOrders.map((order, index) => (
              <div
                key={index}
                className="bg-gray-800 p-2 rounded text-sm flex justify-between items-center"
              >
                <div>
                  <span
                    className={
                      order.type === "buy" ? "text-green-400" : "text-red-400"
                    }
                  >
                    {order.type.toUpperCase()}
                  </span>
                  <span className="text-gray-400">
                    {" "}
                    {order.amount / 100} {tokenSymbol} @ {order.targetPrice}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLimitOrders((prev) =>
                      prev.filter((_, i) => i !== index)
                    );
                    // Add logic to cancel order in your storage/database
                  }}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
