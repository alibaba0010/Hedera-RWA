"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  UTCTimestamp,
  CandlestickSeries,
  LineSeries,
} from "lightweight-charts";
import { Card } from "@/components/ui/card";
import { ChartControls } from "./ChartControls";
import {
  OHLC,
  TimeFrame,
  aggregateOHLC,
  getPriceStats,
} from "@/utils/chartUtils";
import {
  calculateSMA,
  calculateRSI,
  calculateBollingerBands,
} from "@/components/Trading/ChartIndicators";

interface TradingChartProps {
  data?: OHLC[];
  title?: string;
  tokenSymbol?: string;
  height?: number;
  onPriceChange?: (price: number) => void;
}

export const TradingChart = ({
  data: initialData = [],
  title = "Price Chart",
  tokenSymbol = "TOKEN",
  height = 400,
  onPriceChange,
}: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<
    ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null
  >(null);
  const [currentTimeFrame, setCurrentTimeFrame] = useState<TimeFrame>("1h");
  const [chartType, setChartType] = useState<"candlestick" | "line">(
    "candlestick",
  );
  const [indicators, setIndicators] = useState<string[]>([]);

  // Process data based on timeframe
  const displayData = useMemo(() => {
    if (!initialData || initialData.length === 0) return [];
    return aggregateOHLC(initialData, "1h", currentTimeFrame);
  }, [initialData, currentTimeFrame]);

  // Calculate price statistics
  const priceStats = useMemo(() => {
    return getPriceStats(displayData);
  }, [displayData]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#d1d5db",
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartContainerRef.current) {
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: newRect.width });
      }
    });

    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [height]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Remove existing series
    if (seriesRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current);
      } catch (e) {
        // ignore
      }
    }

    if (chartType === "candlestick") {
      const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      candlestickSeries.setData(displayData as CandlestickData[]);
      seriesRef.current = candlestickSeries;
    } else {
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 2,
      });
      const lineData: LineData[] = displayData.map((d) => ({
        time: d.time,
        value: d.close,
      }));
      lineSeries.setData(lineData);
      seriesRef.current = lineSeries;
    }

    // Add Indicators (Simplified for now - can be expanded)
    if (indicators.includes("sma20")) {
      const smaData = calculateSMA(displayData as OHLC[], 20);
      const smaSeries = chartRef.current.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 1,
        title: "SMA 20",
      });
      smaSeries.setData(smaData.map((d) => ({ time: d.time, value: d.value })));
    }

    chartRef.current.timeScale().fitContent();
  }, [chartType, displayData, indicators]);

  return (
    <div className="w-full space-y-4">
      <ChartControls
        currentTimeFrame={currentTimeFrame}
        onTimeFrameChange={setCurrentTimeFrame}
        chartType={chartType}
        onChartTypeChange={setChartType}
        indicators={indicators}
        onAddIndicator={(ind) => setIndicators([...indicators, ind])}
        onRemoveIndicator={(ind) =>
          setIndicators(indicators.filter((i) => i !== ind))
        }
        onRefresh={() => {}}
      />
      <div
        ref={chartContainerRef}
        className="w-full rounded-lg overflow-hidden border border-gray-800"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <div className="text-xs text-muted-foreground uppercase">High</div>
          <div className="text-sm font-medium text-green-500">
            ${priceStats.highest.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase">Low</div>
          <div className="text-sm font-medium text-red-500">
            ${priceStats.lowest.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase">Average</div>
          <div className="text-sm font-medium">
            ${priceStats.average.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase">Latest</div>
          <div className="text-sm font-medium text-blue-500">
            ${priceStats.latest.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
};
