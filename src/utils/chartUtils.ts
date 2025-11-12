import { UTCTimestamp } from "lightweight-charts";

export interface OHLC {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDataPoint {
  time: UTCTimestamp;
  price: number;
  volume: number;
}

export type TimeFrame = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

/**
 * Convert timestamp to UTC timestamp for lightweight-charts
 */
export const toUTCTimestamp = (date: Date): UTCTimestamp => {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
};

/**
 * Aggregate OHLC data to a different timeframe
 */
export const aggregateOHLC = (
  data: OHLC[],
  fromFrame: TimeFrame,
  toFrame: TimeFrame
): OHLC[] => {
  const fromMs = timeFrameToMs(fromFrame);
  const toMs = timeFrameToMs(toFrame);

  if (fromMs >= toMs) return data; // Can't aggregate to smaller timeframe

  const ratio = toMs / fromMs;
  const aggregated: OHLC[] = [];

  for (let i = 0; i < data.length; i += ratio) {
    const chunk = data.slice(i, i + ratio);
    if (chunk.length === 0) continue;

    const firstCandle = chunk[0];
    const lastCandle = chunk[chunk.length - 1];

    const high = Math.max(...chunk.map((c) => c.high));
    const low = Math.min(...chunk.map((c) => c.low));
    const volume = chunk.reduce((sum, c) => sum + c.volume, 0);

    aggregated.push({
      time: firstCandle.time,
      open: firstCandle.open,
      high,
      low,
      close: lastCandle.close,
      volume,
    });
  }

  return aggregated;
};

/**
 * Convert timeframe string to milliseconds
 */
export const timeFrameToMs = (frame: TimeFrame): number => {
  const map: Record<TimeFrame, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
  };
  return map[frame];
};

/**
 * Generate mock OHLC data for testing/demo
 */
export const generateMockOHLC = (
  count: number = 100,
  startPrice: number = 100,
  volatility: number = 0.02
): OHLC[] => {
  const data: OHLC[] = [];
  let currentPrice = startPrice;
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Hourly data
    const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 100000) + 10000;

    data.push({
      time: toUTCTimestamp(timestamp),
      open: Number(open.toFixed(8)),
      high: Number(high.toFixed(8)),
      low: Number(low.toFixed(8)),
      close: Number(close.toFixed(8)),
      volume,
    });

    currentPrice = close;
  }

  return data;
};

/**
 * Calculate price change percentage
 */
export const calculatePriceChange = (
  oldPrice: number,
  newPrice: number
): number => {
  return ((newPrice - oldPrice) / oldPrice) * 100;
};

/**
 * Format price to readable string
 */
export const formatPrice = (price: number, decimals: number = 8): string => {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * Get candle color based on open/close
 */
export const getCandleColor = (
  candle: OHLC
): { upColor: string; downColor: string } => {
  return {
    upColor: "#22c55e", // green
    downColor: "#ef4444", // red
  };
};

/**
 * Calculate support and resistance levels
 */
export const calculateSupportResistance = (
  data: OHLC[]
): { support: number; resistance: number } => {
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);

  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  return { support, resistance };
};

/**
 * Validate OHLC data
 */
export const validateOHLC = (data: OHLC[]): boolean => {
  return data.every(
    (candle) =>
      candle.low <= candle.open &&
      candle.low <= candle.close &&
      candle.high >= candle.open &&
      candle.high >= candle.close &&
      candle.high >= candle.low &&
      candle.volume >= 0
  );
};

/**
 * Get price statistics
 */
export const getPriceStats = (
  data: OHLC[]
): {
  highest: number;
  lowest: number;
  average: number;
  latest: number;
} => {
  if (data.length === 0)
    return { highest: 0, lowest: 0, average: 0, latest: 0 };

  const closes = data.map((d) => d.close);
  const highest = Math.max(...data.map((d) => d.high));
  const lowest = Math.min(...data.map((d) => d.low));
  const average = closes.reduce((a, b) => a + b, 0) / closes.length;
  const latest = closes[closes.length - 1];

  return {
    highest: Number(highest.toFixed(8)),
    lowest: Number(lowest.toFixed(8)),
    average: Number(average.toFixed(8)),
    latest: Number(latest.toFixed(8)),
  };
};
