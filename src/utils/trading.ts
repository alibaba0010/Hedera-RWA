import { supabase } from "./supabase";

interface PriceUpdate {
  tokenId: string;
  price: number;
  timestamp: number;
  volume: number;
}

interface ChartDataPoint {
  time: number; // Unix timestamp in seconds (required by lightweight-charts)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  price: number;
}

interface TokenTrade {
  token_id: string;
  price: number;
  volume: number;
  created_at: string;
}

class PriceManager {
  private static instance: PriceManager;
  private priceHistory: Map<string, ChartDataPoint[]>;
  private listeners: Map<string, ((price: number) => void)[]>;
  private supabaseSubscription: any;
  private initialPrices: Map<string, number>;

  private constructor() {
    this.priceHistory = new Map();
    this.listeners = new Map();
    this.initialPrices = new Map();
    this.initializeSupabaseSubscription();
  }

  public static getInstance(): PriceManager {
    if (!PriceManager.instance) {
      PriceManager.instance = new PriceManager();
    }
    return PriceManager.instance;
  }

  private async initializeSupabaseSubscription() {
    // Subscribe to the trade_history table for real-time updates
    this.supabaseSubscription = supabase
      .channel("trade_history_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trade_history",
        },
        (payload) => {
          const trade = payload.new as TokenTrade;
          this.handlePriceUpdate({
            tokenId: trade.token_id,
            price: trade.price,
            timestamp: new Date(trade.created_at).getTime(),
            volume: trade.volume,
          });
        },
      )
      .subscribe();
  }

  public handlePriceUpdate(update: PriceUpdate) {
    const tokenHistory = this.priceHistory.get(update.tokenId) || [];
    const nowSec = Math.floor(update.timestamp / 1000);
    // 1-minute candle window
    const CANDLE_WINDOW_SEC = 60;

    const last = tokenHistory[tokenHistory.length - 1];

    if (!last || nowSec - (last.time as number) >= CANDLE_WINDOW_SEC) {
      // Start a new candle
      const open = last ? last.close : update.price;
      const newDataPoint: ChartDataPoint = {
        time: nowSec,
        open,
        close: update.price,
        high: Math.max(open, update.price),
        low: Math.min(open, update.price),
        volume: update.volume,
        price: update.price,
      };
      // Keep last 200 data points
      if (tokenHistory.length >= 200) tokenHistory.shift();
      tokenHistory.push(newDataPoint);
    } else {
      // Update the current candle in-place
      last.close = update.price;
      last.high = Math.max(last.high, update.price);
      last.low = Math.min(last.low, update.price);
      last.volume += update.volume;
      last.price = update.price;
    }

    this.priceHistory.set(update.tokenId, tokenHistory);

    // Notify all listeners immediately
    this.notifyListeners(update.tokenId, update.price);
  }

  public subscribeToPrice(tokenId: string, callback: (price: number) => void) {
    if (!this.listeners.has(tokenId)) {
      this.listeners.set(tokenId, []);
    }
    this.listeners.get(tokenId)?.push(callback);

    // Send initial price if available
    const history = this.priceHistory.get(tokenId);
    if (history && history.length > 0) {
      callback(history[history.length - 1].price);
    }
  }

  public unsubscribeFromPrice(
    tokenId: string,
    callback: (price: number) => void,
  ) {
    const tokenListeners = this.listeners.get(tokenId);
    if (tokenListeners) {
      const index = tokenListeners.indexOf(callback);
      if (index !== -1) {
        tokenListeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(tokenId: string, price: number) {
    this.listeners.get(tokenId)?.forEach((callback) => callback(price));
  }

  public async setInitialPrice(tokenId: string, price: number) {
    this.initialPrices.set(tokenId, price);

    // If we don't have any trade history, generate initial data with this price
    if (!this.priceHistory.has(tokenId)) {
      await this.loadTradeHistory(tokenId);
    }
  }

  private async loadTradeHistory(tokenId: string): Promise<void> {
    // Try to load trade history from Supabase
    const { data: trades } = await supabase
      .from("trade_history")
      .select("*")
      .eq("token_id", tokenId)
      .order("created_at", { ascending: true })
      .limit(24);

    if (trades && trades.length > 0) {
      // Convert trade history to chart data points
      const chartData = trades.map((trade: TokenTrade) => ({
        time: Math.floor(new Date(trade.created_at).getTime() / 1000),
        open: trade.price,
        close: trade.price,
        high: trade.price,
        low: trade.price,
        volume: trade.volume,
        price: trade.price,
      }));

      this.priceHistory.set(tokenId, chartData);
    } else {
      // If no trade history, generate initial data using the initial price
      this.generateInitialChartData(tokenId);
    }
  }

  public async getChartData(tokenId: string): Promise<ChartDataPoint[]> {
    if (!this.priceHistory.has(tokenId)) {
      await this.loadTradeHistory(tokenId);
    }
    return (
      this.priceHistory.get(tokenId) || this.generateInitialChartData(tokenId)
    );
  }

  private generateInitialChartData(tokenId: string): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const basePrice = this.initialPrices.get(tokenId) || 100; // Use initial price or default
    let price = basePrice;

    // Generate flat price history when no trades exist
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - (23 - i));

      data.push({
        time: Math.floor(timestamp.getTime() / 1000),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        price: price,
      });
    }

    this.priceHistory.set(tokenId, data);
    return data;
  }
}

export const generateOrderBook = (currentPrice: number) => {
  const asks: { price: number; amount: number; total: number }[] = [];
  const bids: { price: number; amount: number; total: number }[] = [];

  for (let i = 0; i < 8; i++) {
    asks.push({
      price: Number((currentPrice + (i + 1) * 0.001).toFixed(4)),
      amount: Math.floor(Math.random() * 10000) + 1000,
      total: 0,
    });

    bids.push({
      price: Number((currentPrice - (i + 1) * 0.001).toFixed(4)),
      amount: Math.floor(Math.random() * 10000) + 1000,
      total: 0,
    });
  }

  return { asks, bids };
};

export const subscribeToPriceUpdates = (
  tokenId: string,
  callback: (price: number) => void,
  initialPrice: number,
) => {
  const priceManager = PriceManager.getInstance();
  priceManager.setInitialPrice(tokenId, initialPrice);
  priceManager.subscribeToPrice(tokenId, callback);
};

export const unsubscribeFromPriceUpdates = (
  tokenId: string,
  callback: (price: number) => void,
) => {
  const priceManager = PriceManager.getInstance();
  priceManager.unsubscribeFromPrice(tokenId, callback);
};

export const updateTokenPrice = async (
  tokenId: string,
  previousPrice: number,
  tradeAmount: number,
  tradeType: "buy" | "sell",
  traderId: string = "anonymous",
): Promise<number> => {
  // Price impact: each 100 tokens traded moves price by ~0.5%
  // Clamped to a max of 5% per trade to avoid extreme swings
  const rawImpact = (tradeAmount / 100) * 0.005;
  const priceImpact = Math.min(rawImpact, 0.05);

  const newPrice =
    tradeType === "buy"
      ? previousPrice * (1 + priceImpact) // Price rises when buying
      : previousPrice * (1 - priceImpact); // Price falls when selling

  const roundedNewPrice = Number(newPrice.toFixed(8));

  // 1. Write to Supabase trade_history — this triggers the realtime channel
  try {
    await supabase.from("trade_history").insert([
      {
        token_id: tokenId,
        price: roundedNewPrice,
        volume: tradeAmount,
        trade_type: tradeType,
        trader_id: traderId,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn("updateTokenPrice: could not write to trade_history:", err);
  }

  // 2. Also notify in-memory listeners immediately (no round-trip latency)
  const priceManager = PriceManager.getInstance();
  priceManager.handlePriceUpdate({
    tokenId,
    price: roundedNewPrice,
    timestamp: Date.now(),
    volume: tradeAmount,
  });

  return roundedNewPrice;
};

export const getTokenChartData = async (
  tokenId: string,
  initialPrice: number,
): Promise<ChartDataPoint[]> => {
  const priceManager = PriceManager.getInstance();
  await priceManager.setInitialPrice(tokenId, initialPrice);
  return priceManager.getChartData(tokenId);
};
