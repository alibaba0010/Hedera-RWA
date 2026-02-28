"use client";

import type React from "react";
import { useEffect } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { type AssetValueSupplyProps, PAYOUT_OPTIONS } from "@/utils/form";
export type { CalculateSupplyFunction };

type CalculateSupplyFunction = (formatted?: boolean) => number | string;

// Helper function to format number to readable units
const formatToUnits = (number: number) => {
  const units = ["", "Thousand", "Million", "Billion", "Trillion"];
  const order = Math.floor(Math.log10(Math.abs(number)) / 3);
  if (order < 0 || !number) return number.toString();
  const unit = units[order];
  const num = (number / Math.pow(1000, order)).toFixed(1);
  return `${num} ${unit}`;
};

// Helper function to format number with commas
const formatWithCommas = (value: string) => {
  return value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Helper function to remove commas
const removeCommas = (value: string) => {
  return value.replace(/,/g, "");
};

const AssetValueSupply: React.FC<AssetValueSupplyProps> = ({
  assetValueBase,
  setAssetValueBase,
  supplyBase,
  setSupplyBase,
  projectedIncome,
  setProjectedIncome,
  annualIncome,
  setAnnualIncome,
  pricePerTokenUSD,
  setPricePerTokenUSD,
  dividendYield,
  setDividendYield,
  payoutFrequency,
  setPayoutFrequency,
  nextPayout,
  setNextPayout,
  initialSupplyPercentage,
  setInitialSupplyPercentage,
  customInitialSupplyPercentage,
  setCustomInitialSupplyPercentage,
  onCalculateInitialSupply,
}) => {
  // Calculate price per token
  useEffect(() => {
    const assetValue = Number(removeCommas(assetValueBase));
    const totalSupply = Number(removeCommas(supplyBase));

    if (assetValue && totalSupply) {
      setPricePerTokenUSD((assetValue / totalSupply).toFixed(2));
    } else {
      setPricePerTokenUSD("");
    }
  }, [assetValueBase, supplyBase]);

  // Calculate annual income from projected income and payout frequency
  useEffect(() => {
    const pi = Number(projectedIncome);
    let ai = 0;
    if (pi) {
      if (payoutFrequency === "monthly") ai = pi * 12;
      else if (payoutFrequency === "quarterly") ai = pi * 4;
      else ai = pi;
    }
    setAnnualIncome(ai ? ai.toString() : "");
  }, [projectedIncome, payoutFrequency]);

  // Calculate dividend yield
  useEffect(() => {
    const ai = Number(annualIncome);
    const av = Number(removeCommas(assetValueBase));

    if (ai && av) {
      setDividendYield(((ai / av) * 100).toFixed(2));
    } else {
      setDividendYield("");
    }
  }, [annualIncome, assetValueBase]);

  // Set next payout date based on frequency
  useEffect(() => {
    const now = new Date();
    const nextDate = new Date();

    if (payoutFrequency === "monthly") {
      nextDate.setMonth(now.getMonth() + 1);
    } else if (payoutFrequency === "quarterly") {
      nextDate.setMonth(now.getMonth() + 3);
    } else {
      nextDate.setFullYear(now.getFullYear() + 1);
    }

    setNextPayout(nextDate.toISOString().split("T")[0]);
  }, [payoutFrequency]);

  const calculateInitialSupplyValue = (formatted = true) => {
    const totalSupply = Number(removeCommas(supplyBase));
    const percentage =
      initialSupplyPercentage === "custom"
        ? Number(customInitialSupplyPercentage)
        : Number(initialSupplyPercentage);

    if (totalSupply && percentage) {
      const value = Math.floor((totalSupply * percentage) / 100);
      return formatted ? formatToUnits(value) : value;
    }
    return formatted ? "-" : 0;
  };

  // Effect to update parent component with initial supply value
  useEffect(() => {
    if (onCalculateInitialSupply) {
      onCalculateInitialSupply(calculateInitialSupplyValue(false) as number);
    }
  }, [supplyBase, initialSupplyPercentage, customInitialSupplyPercentage]);

  return (
    <div className="space-y-8">
      {/* Primary Asset Information */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="assetValueBase" className="text-sm font-medium">
              Asset Value (USD) *
            </Label>
            <Input
              id="assetValueBase"
              name="assetValueBase"
              value={assetValueBase}
              onChange={(e) => {
                const formattedValue = formatWithCommas(e.target.value);
                setAssetValueBase(formattedValue);
              }}
              placeholder="150,000,000"
              className="h-12 text-base"
              required
            />
            <div className="text-sm text-muted-foreground">
              {Number(removeCommas(assetValueBase)) > 0
                ? `${formatToUnits(Number(removeCommas(assetValueBase)))} USD`
                : "Enter the total asset value"}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="supplyBase" className="text-sm font-medium">
              Total Token Supply (Units) *
            </Label>
            <Input
              id="supplyBase"
              name="supplyBase"
              value={supplyBase}
              onChange={(e) => {
                const formattedValue = formatWithCommas(e.target.value);
                setSupplyBase(formattedValue);
              }}
              placeholder="1,000,000"
              className="h-12 text-base"
              required
            />
            <div className="text-sm text-muted-foreground">
              {Number(removeCommas(supplyBase)) > 0
                ? `${formatToUnits(Number(removeCommas(supplyBase)))} units`
                : "Total number of tokens to be created"}
            </div>
          </div>
        </div>

        {/* Calculated Values */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Price Per Token (USD)</Label>
            <Input
              value={pricePerTokenUSD}
              readOnly
              className="h-12 bg-muted/50 text-base font-medium"
            />
            <div className="text-sm text-muted-foreground">
              Automatically calculated from asset value ÷ total supply
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Dividend Yield (%)</Label>
            <Input
              value={dividendYield}
              readOnly
              className="h-12 bg-muted/50 text-base font-medium"
            />
            <div className="text-sm text-muted-foreground">
              Annual return percentage based on projected income
            </div>
          </div>
        </div>
      </div>

      {/* Income Information */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Projected Income (USD)
            </Label>
            <Input
              value={projectedIncome}
              onChange={(e) =>
                setProjectedIncome(e.target.value.replace(/[^\d.]/g, ""))
              }
              placeholder="10000"
              className="h-12 text-base"
              type="number"
              min={0}
            />
            <div className="text-sm text-muted-foreground">
              Expected income per payout period
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Payout Frequency *</Label>
            <Select value={payoutFrequency} onValueChange={setPayoutFrequency}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {annualIncome && (
                <div className="space-y-1">
                  <div>
                    Annual Income: {Number(annualIncome).toLocaleString()} USD
                  </div>
                  {nextPayout && <div>Next Payout: {nextPayout}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Supply Management */}
      <div className="space-y-6">
        <div className="max-w-md">
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Initial Supply Percentage *
            </Label>
            <div className="text-sm text-muted-foreground mb-3">
              Percentage of tokens you want to keep from the total supply
            </div>
            <Select
              value={initialSupplyPercentage}
              onValueChange={setInitialSupplyPercentage}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select percentage to keep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% (Mint as needed)</SelectItem>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="25">25%</SelectItem>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="60">60%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="custom">Custom Percentage</SelectItem>
              </SelectContent>
            </Select>

            {initialSupplyPercentage === "custom" && (
              <Input
                type="number"
                min="0"
                max="100"
                value={customInitialSupplyPercentage}
                onChange={(e) => {
                  const value = Math.min(
                    100,
                    Math.max(0, Number(e.target.value))
                  );
                  setCustomInitialSupplyPercentage(value.toString());
                }}
                placeholder="Enter percentage (0-100)"
                className="h-12 text-base mt-3"
              />
            )}

            <div className="text-base font-medium text-foreground bg-muted/30 p-3 rounded-md">
              Initial Supply: {calculateInitialSupplyValue()} units
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetValueSupply;
