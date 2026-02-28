"use client";

import { Button } from "@/components/ui/button";
import { TimeFrame } from "@/utils/chartUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartControlsProps {
  currentTimeFrame: TimeFrame;
  onTimeFrameChange: (frame: TimeFrame) => void;
  chartType: "candlestick" | "line";
  onChartTypeChange: (type: "candlestick" | "line") => void;
  indicators: string[];
  onAddIndicator: (indicator: string) => void;
  onRemoveIndicator: (indicator: string) => void;
  onRefresh?: () => void;
}

const TIME_FRAMES: TimeFrame[] = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];
const INDICATORS = [
  { id: "sma20", label: "SMA 20", color: "#3b82f6" },
  { id: "sma50", label: "SMA 50", color: "#8b5cf6" },
  { id: "sma200", label: "SMA 200", color: "#ec4899" },
  { id: "rsi", label: "RSI", color: "#f59e0b" },
  { id: "bb", label: "Bollinger Bands", color: "#06b6d4" },
  { id: "macd", label: "MACD", color: "#10b981" },
];

export const ChartControls = ({
  currentTimeFrame,
  onTimeFrameChange,
  chartType,
  onChartTypeChange,
  indicators,
  onAddIndicator,
  onRemoveIndicator,
  onRefresh,
}: ChartControlsProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
      {/* Timeframe buttons */}
      <div className="flex gap-1 flex-wrap">
        {TIME_FRAMES.map((frame) => (
          <Button
            key={frame}
            size="sm"
            variant={currentTimeFrame === frame ? "default" : "outline"}
            onClick={() => onTimeFrameChange(frame)}
            className={`text-xs ${
              currentTimeFrame === frame
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600 border-gray-600"
            }`}
          >
            {frame}
          </Button>
        ))}
      </div>

      {/* Chart type selection */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={chartType === "candlestick" ? "default" : "outline"}
          onClick={() => onChartTypeChange("candlestick")}
          className={`text-xs ${
            chartType === "candlestick"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-700 hover:bg-gray-600 border-gray-600"
          }`}
        >
          Candlestick
        </Button>
        <Button
          size="sm"
          variant={chartType === "line" ? "default" : "outline"}
          onClick={() => onChartTypeChange("line")}
          className={`text-xs ${
            chartType === "line"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-700 hover:bg-gray-600 border-gray-600"
          }`}
        >
          Line
        </Button>
      </div>

      {/* Indicators */}
      <Select
        onValueChange={(id) => {
          if (indicators.includes(id)) {
            onRemoveIndicator(id);
          } else {
            onAddIndicator(id);
          }
        }}
      >
        <SelectTrigger className="w-40 h-8 text-xs bg-gray-700 border-gray-600">
          <SelectValue placeholder="Add Indicator" />
        </SelectTrigger>
        <SelectContent>
          {INDICATORS.map((indicator) => {
            const isAdded = indicators.includes(indicator.id);
            return (
              <SelectItem key={indicator.id} value={indicator.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: indicator.color }}
                  />
                  <span>{indicator.label}</span>
                  {isAdded && (
                    <span className="ml-2 text-green-500 font-bold">✓</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Active indicators display */}
      {indicators.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {indicators.map((indicator) => {
            const ind = INDICATORS.find((i) => i.id === indicator);
            return (
              <div
                key={indicator}
                className="flex items-center gap-2 px-2 py-1 bg-gray-700 rounded text-xs"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ind?.color }}
                />
                <span>{ind?.label}</span>
                <button
                  onClick={() => onRemoveIndicator(indicator)}
                  className="ml-1 text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh button */}
      {onRefresh && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          className="text-xs bg-gray-700 hover:bg-gray-600 border-gray-600"
        >
          ⟳ Refresh
        </Button>
      )}
    </div>
  );
};
