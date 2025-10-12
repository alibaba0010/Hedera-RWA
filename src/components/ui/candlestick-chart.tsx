"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

interface CandlestickChartProps {
  data: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }[];
  basePrice: number;
}

export function CandlestickChart({ data, basePrice }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart
    chart.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "rgb(17, 24, 39)" },
        textColor: "rgba(255, 255, 255, 0.9)",
      },
      grid: {
        vertLines: { color: "rgba(55, 65, 81, 0.5)" },
        horzLines: { color: "rgba(55, 65, 81, 0.5)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });

    // Create candlestick series
    const candlestickSeries = chart.current.addCandlestickSeries({
      upColor: "rgb(34, 197, 94)",
      downColor: "rgb(239, 68, 68)",
      borderVisible: false,
      wickUpColor: "rgb(34, 197, 94)",
      wickDownColor: "rgb(239, 68, 68)",
    });

    // Add base price line
    const baselineSeries = chart.current.addLineSeries({
      color: "rgba(255, 255, 255, 0.5)",
      lineWidth: 1,
      lineStyle: 2, // Dashed line
    });

    // Format data for candlestick chart
    const formattedData = data.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    // Set the data
    candlestickSeries.setData(formattedData);

    // Add baseline
    const baselineData = data.map((d) => ({
      time: d.time,
      value: basePrice,
    }));
    baselineSeries.setData(baselineData);

    // Add volume histogram if available
    if (data[0]?.volume !== undefined) {
      const volumeSeries = chart.current.addHistogramSeries({
        color: "rgba(55, 65, 81, 0.5)",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "", // Set as an overlay
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      const volumeData = data.map((d) => ({
        time: d.time,
        value: d.volume || 0,
        color:
          d.close >= d.open
            ? "rgba(34, 197, 94, 0.3)"
            : "rgba(239, 68, 68, 0.3)",
      }));

      volumeSeries.setData(volumeData);
    }

    // Fit the content
    chart.current.timeScale().fitContent();

    // Cleanup
    return () => {
      chart.current?.remove();
    };
  }, [data, basePrice]);

  return <div ref={chartContainerRef} />;
}