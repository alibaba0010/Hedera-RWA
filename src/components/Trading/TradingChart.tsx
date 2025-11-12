"use client";

import React, { useMemo, useState } from "react";
import {
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartControls } from "./ChartControls";
import {
  OHLC,
  TimeFrame,
  aggregateOHLC,
  generateMockOHLC,
  getPriceStats,
  calculatePriceChange,
} from "@/utils/chartUtils";
import {
  calculateSMA,
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
} from "@/components/Trading/ChartIndicators";
import { Card } from "@/components/ui/card";

interface TradingChartProps {
  data?: OHLC[];
  title?: string;
  tokenSymbol?: string;
  height?: number;
  onPriceChange?: (price: number) => void;
}

export const TradingChart = ({
  data: initialData,
  title = "Price Chart",
  tokenSymbol = "TOKEN",
  height = 400,
  onPriceChange,
}: TradingChartProps) => {
  const [currentTimeFrame, setCurrentTimeFrame] = useState<TimeFrame>("1h");
  const [chartType, setChartType] = useState<"candlestick" | "line">(
    "candlestick"
  );
  const [indicators, setIndicators] = useState<string[]>([]);

  // Initialize with mock data if no data provided
  const data = initialData || generateMockOHLC(100, 100);

  // Process data based on timeframe
  const displayData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return aggregateOHLC(data, "1h", currentTimeFrame);
  }, [data, currentTimeFrame]);

  // Calculate price statistics
  const priceStats = useMemo(() => {
    return getPriceStats(displayData);
  }, [displayData]);

  // Merge indicators with chart data
  const chartData = useMemo(() => {
    if (displayData.length === 0) return [];

    let merged = displayData.map((candle) => ({
      time: new Date(Number(candle.time) * 1000).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      open: Number(candle.open.toFixed(8)),
      close: Number(candle.close.toFixed(8)),
      high: Number(candle.high.toFixed(8)),
      low: Number(candle.low.toFixed(8)),
      volume: candle.volume,
    }));

    // Add indicators
    if (indicators.length > 0) {
      if (indicators.includes("sma20")) {
        const sma = calculateSMA(displayData as any[], 20);
        merged = merged
          .slice(displayData.length - sma.length)
          .map((item, i) => ({
            ...item,
            sma20: Number(sma[i]?.value.toFixed(8)) || null,
          }));
      }

      if (indicators.includes("sma50")) {
        const sma = calculateSMA(displayData as any[], 50);
        merged = merged
          .slice(displayData.length - sma.length)
          .map((item, i) => ({
            ...item,
            sma50: Number(sma[i]?.value.toFixed(8)) || null,
          }));
      }

      if (indicators.includes("sma200")) {
        const sma = calculateSMA(displayData as any[], 200);
        merged = merged
          .slice(displayData.length - sma.length)
          .map((item, i) => ({
            ...item,
            sma200: Number(sma[i]?.value.toFixed(8)) || null,
          }));
      }

      if (indicators.includes("bb")) {
        const bb = calculateBollingerBands(displayData as any[], 20, 2);
        merged = merged
          .slice(displayData.length - bb.upper.length)
          .map((item, i) => ({
            ...item,
            bbUpper: Number(bb.upper[i]?.value.toFixed(8)) || null,
            bbMiddle: Number(bb.middle[i]?.value.toFixed(8)) || null,
            bbLower: Number(bb.lower[i]?.value.toFixed(8)) || null,
          }));
      }

      if (indicators.includes("rsi")) {
        const rsi = calculateRSI(displayData as any[]);
        merged = merged
          .slice(displayData.length - rsi.length)
          .map((item, i) => ({
            ...item,
            rsi: Number(rsi[i]?.value.toFixed(2)) || null,
          }));
      }

      if (indicators.includes("macd")) {
        const macd = calculateMACD(displayData as any[]);
        merged = merged
          .slice(displayData.length - macd.macd.length)
          .map((item, i) => ({
            ...item,
            macd: Number(macd.macd[i]?.value.toFixed(8)) || null,
            macdSignal: Number(macd.signal[i]?.value.toFixed(8)) || null,
            macdHistogram: Number(macd.histogram[i]?.value.toFixed(8)) || null,
          }));
      }
    }

    return merged;
  }, [displayData, indicators]);

  // Notify price change
  React.useEffect(() => {
    if (onPriceChange && priceStats.latest) {
      onPriceChange(priceStats.latest);
    }
  }, [priceStats.latest, onPriceChange]);

  const handleAddIndicator = (indicator: string) => {
    if (!indicators.includes(indicator)) {
      setIndicators([...indicators, indicator]);
    }
  };

  const handleRemoveIndicator = (indicator: string) => {
    setIndicators(indicators.filter((i) => i !== indicator));
  };

  const handleRefresh = () => {
    // Trigger re-render
    setCurrentTimeFrame(currentTimeFrame);
  };

  return (
    <Card className="w-full bg-gray-900 border-gray-800">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-sm font-medium text-white">{title}</h3>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  ${priceStats.latest.toFixed(8)}
                </span>
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    calculatePriceChange(
                      priceStats.lowest,
                      priceStats.latest
                    ) >= 0
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {calculatePriceChange(priceStats.lowest, priceStats.latest) >=
                  0
                    ? "+"
                    : ""}
                  {calculatePriceChange(
                    priceStats.lowest,
                    priceStats.latest
                  ).toFixed(2)}
                  %
                </span>
              </div>

              {/* Price stats */}
              <div className="flex gap-4 text-xs text-gray-400">
                <div>
                  <span>H: </span>
                  <span className="text-green-400">
                    ${priceStats.highest.toFixed(8)}
                  </span>
                </div>
                <div>
                  <span>L: </span>
                  <span className="text-red-400">
                    ${priceStats.lowest.toFixed(8)}
                  </span>
                </div>
                <div>
                  <span>Avg: </span>
                  <span className="text-blue-400">
                    ${priceStats.average.toFixed(8)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <ChartControls
          currentTimeFrame={currentTimeFrame}
          onTimeFrameChange={setCurrentTimeFrame}
          chartType={chartType}
          onChartTypeChange={setChartType}
          indicators={indicators}
          onAddIndicator={handleAddIndicator}
          onRemoveIndicator={handleRemoveIndicator}
          onRefresh={handleRefresh}
        />

        {/* Main Chart */}
        {chartData.length > 0 && (
          <div className="w-full rounded-lg overflow-hidden bg-gray-950">
            <ResponsiveContainer width="100%" height={height}>
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  style={{ fontSize: "12px" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: any) =>
                    typeof value === "number" ? value.toFixed(8) : value
                  }
                />

                {/* Line chart for close prices */}
                {chartType === "line" && (
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                    name="Close"
                  />
                )}

                {/* Candlestick visualization using bars */}
                {chartType === "candlestick" && (
                  <>
                    {chartData.map((entry, index) => {
                      const isUp = entry.close >= entry.open;
                      return (
                        <ReferenceLine
                          key={`candle-${index}`}
                          x={entry.time}
                          stroke="transparent"
                        />
                      );
                    })}
                  </>
                )}

                {/* SMA 20 */}
                {indicators.includes("sma20") && (
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                    name="SMA 20"
                  />
                )}

                {/* SMA 50 */}
                {indicators.includes("sma50") && (
                  <Line
                    type="monotone"
                    dataKey="sma50"
                    stroke="#8b5cf6"
                    dot={false}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                    name="SMA 50"
                  />
                )}

                {/* SMA 200 */}
                {indicators.includes("sma200") && (
                  <Line
                    type="monotone"
                    dataKey="sma200"
                    stroke="#ec4899"
                    dot={false}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                    name="SMA 200"
                  />
                )}

                {/* Bollinger Bands */}
                {indicators.includes("bb") && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="bbUpper"
                      stroke="#06b6d4"
                      dot={false}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      isAnimationActive={false}
                      name="BB Upper"
                    />
                    <Line
                      type="monotone"
                      dataKey="bbMiddle"
                      stroke="#06b6d4"
                      dot={false}
                      strokeWidth={1}
                      isAnimationActive={false}
                      name="BB Middle"
                    />
                    <Line
                      type="monotone"
                      dataKey="bbLower"
                      stroke="#06b6d4"
                      dot={false}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      isAnimationActive={false}
                      name="BB Lower"
                    />
                  </>
                )}

                <Legend
                  wrapperStyle={{ paddingTop: "20px", color: "#9ca3af" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* RSI Chart */}
        {indicators.includes("rsi") && chartData.length > 0 && (
          <div className="w-full rounded-lg overflow-hidden bg-gray-950">
            <div className="p-2 text-xs text-gray-400 font-medium">
              RSI (14)
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  style={{ fontSize: "12px" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: "12px" }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <ReferenceLine
                  y={70}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: "70", position: "right", fill: "#ef4444" }}
                />
                <ReferenceLine
                  y={30}
                  stroke="#22c55e"
                  strokeDasharray="5 5"
                  label={{ value: "30", position: "right", fill: "#22c55e" }}
                />
                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* MACD Chart */}
        {indicators.includes("macd") && chartData.length > 0 && (
          <div className="w-full rounded-lg overflow-hidden bg-gray-950">
            <div className="p-2 text-xs text-gray-400 font-medium">MACD</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  style={{ fontSize: "12px" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="5 5" />
                <Line
                  type="monotone"
                  dataKey="macd"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  name="MACD"
                />
                <Line
                  type="monotone"
                  dataKey="macdSignal"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  name="Signal"
                />
                <Legend
                  wrapperStyle={{ paddingTop: "10px", color: "#9ca3af" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
};
