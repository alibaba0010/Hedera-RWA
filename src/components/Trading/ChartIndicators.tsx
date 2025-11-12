"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineStyle,
  UTCTimestamp,
  ISeriesApi,
} from "lightweight-charts";

interface IndicatorPoint {
  time: UTCTimestamp;
  value: number;
}

interface IndicatorData {
  sma20?: IndicatorPoint[];
  sma50?: IndicatorPoint[];
  sma200?: IndicatorPoint[];
  rsi?: IndicatorPoint[];
  bb_upper?: IndicatorPoint[];
  bb_lower?: IndicatorPoint[];
  bb_middle?: IndicatorPoint[];
}

export interface IChartIndicators {
  addIndicator(
    type: string,
    data: IndicatorPoint[],
    options?: any
  ): ISeriesApi<any>;
  removeIndicator(type: string): void;
  updateIndicators(data: IndicatorData): void;
}

/**
 * Simple Moving Average Calculation
 */
export const calculateSMA = (
  data: Array<{ time: UTCTimestamp; close: number }>,
  period: number
): IndicatorPoint[] => {
  const result: IndicatorPoint[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const sum = data
      .slice(i - period + 1, i + 1)
      .reduce((acc, point) => acc + point.close, 0);
    const average = sum / period;
    result.push({
      time: data[i].time,
      value: Number(average.toFixed(8)),
    });
  }

  return result;
};

/**
 * Relative Strength Index Calculation
 */
export const calculateRSI = (
  data: Array<{ time: UTCTimestamp; close: number }>,
  period: number = 14
): IndicatorPoint[] => {
  const result: IndicatorPoint[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;

    if (i < period) continue;

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    result.push({
      time: data[i].time,
      value: Number(rsi.toFixed(2)),
    });

    gains = 0;
    losses = 0;
  }

  return result;
};

/**
 * Bollinger Bands Calculation
 */
export const calculateBollingerBands = (
  data: Array<{ time: UTCTimestamp; close: number }>,
  period: number = 20,
  stdDev: number = 2
): {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
} => {
  const sma = calculateSMA(data, period);
  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  for (let i = 0; i < sma.length; i++) {
    const smaPeriodStart = Math.max(
      0,
      data.length - sma.length + i - period + 1
    );
    const smaPeriodEnd = smaPeriodStart + period;

    let variance = 0;
    for (let j = smaPeriodStart; j < smaPeriodEnd && j < data.length; j++) {
      variance += Math.pow(data[j].close - sma[i].value, 2);
    }
    variance /= period;

    const std = Math.sqrt(variance);
    const midValue = sma[i].value;
    const upperValue = midValue + stdDev * std;
    const lowerValue = midValue - stdDev * std;

    middle.push({
      time: sma[i].time,
      value: Number(midValue.toFixed(8)),
    });
    upper.push({
      time: sma[i].time,
      value: Number(upperValue.toFixed(8)),
    });
    lower.push({
      time: sma[i].time,
      value: Number(lowerValue.toFixed(8)),
    });
  }

  return { upper, middle, lower };
};

/**
 * MACD Calculation
 */
export const calculateMACD = (
  data: Array<{ time: UTCTimestamp; close: number }>,
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
} => {
  const ema12 = calculateEMA(data, fastPeriod);
  const ema26 = calculateEMA(data, slowPeriod);
  const macd: IndicatorPoint[] = [];

  const startLength = Math.max(ema12.length, ema26.length);
  for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
    const macdValue = ema12[i].value - ema26[i].value;
    macd.push({
      time: ema12[i].time,
      value: Number(macdValue.toFixed(8)),
    });
  }

  const signal = calculateEMAFromIndicators(macd, signalPeriod);
  const histogram: IndicatorPoint[] = [];

  for (let i = 0; i < macd.length; i++) {
    const signalValue = signal[i]?.value || 0;
    histogram.push({
      time: macd[i].time,
      value: Number((macd[i].value - signalValue).toFixed(8)),
    });
  }

  return { macd, signal, histogram };
};

/**
 * Exponential Moving Average Calculation
 */
export const calculateEMA = (
  data: Array<{ time: UTCTimestamp; close: number }>,
  period: number
): IndicatorPoint[] => {
  const result: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: Number(ema.toFixed(8)) });

  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * multiplier + ema * (1 - multiplier);
    result.push({ time: data[i].time, value: Number(ema.toFixed(8)) });
  }

  return result;
};

/**
 * Calculate EMA from indicator points
 */
export const calculateEMAFromIndicators = (
  data: IndicatorPoint[],
  period: number
): IndicatorPoint[] => {
  const result: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i].value;
  }
  let ema = sum / Math.min(period, data.length);
  result.push({
    time: data[Math.min(period - 1, data.length - 1)].time,
    value: Number(ema.toFixed(8)),
  });

  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    ema = data[i].value * multiplier + ema * (1 - multiplier);
    result.push({ time: data[i].time, value: Number(ema.toFixed(8)) });
  }

  return result;
};
