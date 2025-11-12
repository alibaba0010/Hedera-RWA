"use client";

import React, { useState } from "react";
import { TradingChart } from "@/components/Trading/TradingChart";
import { generateMockOHLC } from "@/utils/chartUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Example component demonstrating TradingChart usage
 * Shows various configurations and features
 */
export function ChartExample() {
  const [selectedExample, setSelectedExample] = useState<
    "basic" | "bitcoin" | "ethereum" | "custom"
  >("basic");
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Generate different datasets
  const basicData = generateMockOHLC(100, 100, 0.02);
  const bitcoinData = generateMockOHLC(150, 45000, 0.03);
  const ethereumData = generateMockOHLC(150, 2500, 0.025);
  const customData = generateMockOHLC(200, 150, 0.05);

  const handlePriceChange = (price: number) => {
    setCurrentPrice(price);
    setPriceHistory((prev) => [...prev.slice(-9), price]); // Keep last 10 prices
  };

  const examples = {
    basic: {
      title: "Basic Chart Example",
      description: "Default chart configuration with mock data",
      data: basicData,
      props: {
        title: "Basic Trading Chart",
        tokenSymbol: "TOKEN",
        height: 400,
      },
    },
    bitcoin: {
      title: "Bitcoin Chart",
      description: "BTC/USD price chart with realistic volatility",
      data: bitcoinData,
      props: {
        title: "Bitcoin (BTC) Price Chart",
        tokenSymbol: "BTC",
        height: 450,
      },
    },
    ethereum: {
      title: "Ethereum Chart",
      description: "ETH/USD price chart",
      data: ethereumData,
      props: {
        title: "Ethereum (ETH) Price Chart",
        tokenSymbol: "ETH",
        height: 450,
      },
    },
    custom: {
      title: "Custom Configuration",
      description: "High volatility custom asset",
      data: customData,
      props: {
        title: "Custom Asset Price Chart",
        tokenSymbol: "CUSTOM",
        height: 500,
      },
    },
  };

  const currentExample = examples[selectedExample];

  return (
    <div className="space-y-6 p-6 bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Trading Chart Component Examples
        </h1>
        <p className="text-gray-400">
          Comprehensive chart component with technical indicators and multiple
          timeframes
        </p>
      </div>

      {/* Example Selector */}
      <Card className="bg-gray-900 border-gray-800 p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase">
          Select Example
        </h2>
        <div className="flex flex-wrap gap-2">
          {(["basic", "bitcoin", "ethereum", "custom"] as const).map(
            (example) => (
              <Button
                key={example}
                onClick={() => {
                  setSelectedExample(example);
                  setCurrentPrice(0);
                  setPriceHistory([]);
                }}
                variant={selectedExample === example ? "default" : "outline"}
                className={`${
                  selectedExample === example
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-800 hover:bg-gray-700 border-gray-700"
                }`}
              >
                {examples[example].title}
              </Button>
            )
          )}
        </div>
      </Card>

      {/* Description */}
      <Card className="bg-gray-900 border-gray-800 p-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          {currentExample.title}
        </h3>
        <p className="text-gray-400 text-sm">{currentExample.description}</p>
      </Card>

      {/* Price Information */}
      {currentPrice > 0 && (
        <Card className="bg-gray-900 border-gray-800 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase">
            Price Information
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Current Price</div>
              <div className="text-2xl font-bold text-white">
                ${currentPrice.toFixed(8)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">History (Last 10)</div>
              <div className="text-xs text-gray-400 font-mono">
                {priceHistory.map((p) => p.toFixed(2)).join(" → ")}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Price Range</div>
              {priceHistory.length > 0 && (
                <div className="text-sm text-gray-300">
                  <div>Min: ${Math.min(...priceHistory).toFixed(8)}</div>
                  <div>Max: ${Math.max(...priceHistory).toFixed(8)}</div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Chart */}
      <TradingChart
        data={currentExample.data}
        {...currentExample.props}
        onPriceChange={handlePriceChange}
      />

      {/* Features */}
      <Card className="bg-gray-900 border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase">
          Features
        </h3>
        <ul className="grid grid-cols-2 gap-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            Multiple Chart Types (Candlestick, Line)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            Timeframe Selection (1m - 1w)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-400 rounded-full" />
            Simple Moving Averages (20, 50, 200)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            RSI Indicator with Overbought/Oversold
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 rounded-full" />
            Bollinger Bands
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            MACD with Signal Line
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full" />
            Real-time Price Updates
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-pink-400 rounded-full" />
            Responsive Design
          </li>
        </ul>
      </Card>

      {/* Usage Example */}
      <Card className="bg-gray-900 border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase">
          Usage Example
        </h3>
        <pre className="bg-gray-950 p-3 rounded text-xs text-gray-300 overflow-x-auto">
          {`import { TradingChart } from "@/components/Trading/TradingChart";

export function MyChart() {
  const handlePriceChange = (price: number) => {
    console.log("Price:", price);
  };

  return (
    <TradingChart
      title="Bitcoin Chart"
      tokenSymbol="BTC"
      height={400}
      onPriceChange={handlePriceChange}
    />
  );
}`}
        </pre>
      </Card>

      {/* Props Reference */}
      <Card className="bg-gray-900 border-gray-800 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase">
          Props Reference
        </h3>
        <div className="space-y-2 text-sm text-gray-300">
          <div>
            <span className="font-mono text-blue-400">data</span>
            <span className="text-gray-500">?: OHLC[]</span>
            <p className="text-xs text-gray-400 ml-4">
              OHLC data points (auto-generated if not provided)
            </p>
          </div>
          <div>
            <span className="font-mono text-blue-400">title</span>
            <span className="text-gray-500">?: string</span>
            <p className="text-xs text-gray-400 ml-4">
              Chart title (default: "Price Chart")
            </p>
          </div>
          <div>
            <span className="font-mono text-blue-400">tokenSymbol</span>
            <span className="text-gray-500">?: string</span>
            <p className="text-xs text-gray-400 ml-4">
              Token symbol for display (default: "TOKEN")
            </p>
          </div>
          <div>
            <span className="font-mono text-blue-400">height</span>
            <span className="text-gray-500">?: number</span>
            <p className="text-xs text-gray-400 ml-4">
              Chart height in pixels (default: 400)
            </p>
          </div>
          <div>
            <span className="font-mono text-blue-400">onPriceChange</span>
            <span className="text-gray-500">?: (price: number) =&gt; void</span>
            <p className="text-xs text-gray-400 ml-4">
              Callback for price updates
            </p>
          </div>
        </div>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-900/20 border-blue-800 p-4">
        <div className="flex gap-3">
          <div className="text-blue-400 font-bold text-lg">ℹ️</div>
          <div>
            <h4 className="font-semibold text-blue-300 mb-1">
              Try the Interactive Features
            </h4>
            <p className="text-sm text-blue-200">
              Click on the chart controls to switch timeframes, change chart
              types, and add/remove technical indicators. The chart updates in
              real-time with price changes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
