"use client";

import React, { useEffect, useRef, useMemo } from "react";
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
import { ChartControls } from "./ChartControls";
import {
  OHLC,
  TimeFrame,
  aggregateOHLC,
  getPriceStats,
} from "@/utils/chartUtils";
import { calculateSMA } from "@/components/Trading/ChartIndicators";
import { useState } from "react";

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
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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

  // ── Step 1: Initialize chart once ──────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#d1d5db",
      },
      width: chartContainerRef.current.clientWidth,
      height,
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: true,
      },
    });

    chartRef.current = chart;

    // Create both series upfront — toggle visibility instead of add/remove
    const cSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = cSeries;

    const lSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      visible: false,
    });
    lineSeriesRef.current = lSeries;

    // SMA series (hidden by default)
    const smaSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      title: "SMA 20",
      visible: false,
    });
    smaSeriesRef.current = smaSeries;

    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartContainerRef.current) {
        chart.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      smaSeriesRef.current = null;
      chartRef.current = null;
      chart.remove();
    };
  }, [height]); // only re-create if height changes

  // ── Step 2: Push data into existing series whenever data / type / indicators change ─
  useEffect(() => {
    const chart = chartRef.current;
    const cSeries = candleSeriesRef.current;
    const lSeries = lineSeriesRef.current;
    const smaSeries = smaSeriesRef.current;
    if (!chart || !cSeries || !lSeries || !smaSeries) return;

    if (displayData.length === 0) return;

    // Sort by time (lightweight-charts requires ascending order)
    const sorted = [...displayData].sort(
      (a, b) => (a.time as number) - (b.time as number),
    );

    // Remove duplicates (lightweight-charts requires strictly increasing time)
    const uniqueSorted = sorted.filter(
      (item, index, self) => index === 0 || item.time !== self[index - 1].time,
    );

    if (chartType === "candlestick") {
      cSeries.applyOptions({ visible: true });
      lSeries.applyOptions({ visible: false });
      cSeries.setData(uniqueSorted as CandlestickData[]);
    } else {
      cSeries.applyOptions({ visible: false });
      lSeries.applyOptions({ visible: true });
      const lineData: LineData[] = uniqueSorted.map((d) => ({
        time: d.time,
        value: d.close,
      }));
      lSeries.setData(lineData);
    }

    // SMA indicator
    if (indicators.includes("sma20") && uniqueSorted.length >= 20) {
      const smaData = calculateSMA(uniqueSorted as OHLC[], 20);
      smaSeries.applyOptions({ visible: true });
      smaSeries.setData(smaData.map((d) => ({ time: d.time, value: d.value })));
    } else {
      smaSeries.applyOptions({ visible: false });
    }

    chart.timeScale().fitContent();
  }, [chartType, displayData, indicators]);

  // ── Step 3: Stream new candle updates via update() (not setData) ────────────
  // This effect listens for the very last data point being appended
  // and calls series.update() to avoid full redraws.
  const prevDataLenRef = useRef<number>(0);

  useEffect(() => {
    const chart = chartRef.current;
    const cSeries = candleSeriesRef.current;
    const lSeries = lineSeriesRef.current;
    if (!chart || !cSeries || !lSeries) return;
    if (displayData.length === 0) return;

    const sorted = [...displayData].sort(
      (a, b) => (a.time as number) - (b.time as number),
    );
    const uniqueSorted = sorted.filter(
      (item, index, self) => index === 0 || item.time !== self[index - 1].time,
    );

    if (uniqueSorted.length === 0) return;
    const last = uniqueSorted[uniqueSorted.length - 1];

    // Only call update() for incremental additions (not full reloads)
    if (
      uniqueSorted.length > prevDataLenRef.current &&
      prevDataLenRef.current > 0
    ) {
      try {
        if (chartType === "candlestick") {
          cSeries.update(last as CandlestickData);
        } else {
          lSeries.update({ time: last.time, value: last.close });
        }
      } catch {
        // If update fails (e.g., time not strictly increasing), setData handles it
      }
    }
    prevDataLenRef.current = uniqueSorted.length;
  }, [displayData, chartType]);

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
