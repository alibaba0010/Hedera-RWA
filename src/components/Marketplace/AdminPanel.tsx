"use client";

import { useState, useContext } from "react";
import { WalletContext } from "@/contexts/WalletContext";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Coins, RefreshCw } from "lucide-react";
import { grantKyc, distributeYield } from "@/utils/hedera-integration";
import { useNotification } from "@/contexts/notification-context";

interface AdminPanelProps {
  tokenId: string;
  assetOwner: string;
}

export function AdminPanel({ tokenId, assetOwner }: AdminPanelProps) {
  const { accountId, signer } = useContext(WalletContext);
  const { showNotification } = useNotification();

  const [kycAccountId, setKycAccountId] = useState("");
  const [isGrantingKyc, setIsGrantingKyc] = useState(false);

  const [yieldAmount, setYieldAmount] = useState("");
  const [isDistributingYield, setIsDistributingYield] = useState(false);

  // Read-only logic to only show the panel to the asset creator
  if (accountId !== assetOwner) {
    return null;
  }

  const handleGrantKyc = async () => {
    if (!kycAccountId) return;
    setIsGrantingKyc(true);
    try {
      await grantKyc(tokenId, kycAccountId);
      showNotification({
        title: "KYC Granted",
        message: `Successfully granted KYC to ${kycAccountId}`,
        variant: "success",
      });
      setKycAccountId("");
    } catch (error: any) {
      showNotification({
        title: "KYC Grant Failed",
        message: error.message || "An error occurred",
        variant: "error",
      });
    } finally {
      setIsGrantingKyc(false);
    }
  };

  const handleDistributeYield = async () => {
    if (!yieldAmount || !signer) return;
    setIsDistributingYield(true);
    try {
      const { totalDistributed } = await distributeYield(
        tokenId,
        Number(yieldAmount),
        signer,
      );
      showNotification({
        title: "Micro-Dividend Distributed",
        message: `Successfully dropped ${totalDistributed} HBAR to token holders.`,
        variant: "success",
      });
      setYieldAmount("");
    } catch (error: any) {
      showNotification({
        title: "Yield Distribution Failed",
        message: error.message || "An error occurred",
        variant: "error",
      });
    } finally {
      setIsDistributingYield(false);
    }
  };

  return (
    <Card className="mt-6 border-blue-500/30 dark:border-blue-500/20 bg-blue-50/5 dark:bg-blue-900/10">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          Asset Admin Controls
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Since you created this asset, you can manage compliance and distribute
          automated micro-dividends.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Yield Distribution Section */}
        <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700/60 rounded-lg bg-white/60 dark:bg-gray-800/50">
          <div>
            <Label className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Coins className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              Distribute Micro-Dividend (HBAR)
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Distribute HBAR instantly to all existing token holders
              proportional to their supply fraction.
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <Input
              type="number"
              placeholder="e.g. 100 HBAR total"
              value={yieldAmount}
              onChange={(e) => setYieldAmount(e.target.value)}
              className="max-w-[200px] dark:bg-gray-900/60 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <Button
              onClick={handleDistributeYield}
              disabled={isDistributingYield || !yieldAmount}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white w-32"
            >
              {isDistributingYield ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Airdrop Yield"
              )}
            </Button>
          </div>
        </div>

        {/* KYC Section */}
        <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-700/60 rounded-lg bg-white/60 dark:bg-gray-800/50">
          <div>
            <Label className="text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <ShieldCheck className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              Automated Identity/KYC Approval
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Grant a verified Hedera Account ID the ability to purchase and
              trade this compliant RWA security.
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <Input
              placeholder="0.0.123456"
              value={kycAccountId}
              onChange={(e) => setKycAccountId(e.target.value)}
              className="max-w-[200px] dark:bg-gray-900/60 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <Button
              onClick={handleGrantKyc}
              disabled={isGrantingKyc || !kycAccountId}
              className="w-32 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 dark:border-gray-600"
            >
              {isGrantingKyc ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Grant KYC"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
