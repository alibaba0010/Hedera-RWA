import { supabase } from "./supabase";

interface PriceUpdate {
  tokenId: string;
  price: number;
  timestamp: number;
  volume: number;
}

interface ChartDataPoint {
  time: string;
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
      .channel('trade_history_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_history',
        },
        (payload) => {
          const trade = payload.new as TokenTrade;
          this.handlePriceUpdate({
            tokenId: trade.token_id,
            price: trade.price,
            timestamp: new Date(trade.created_at).getTime(),
            volume: trade.volume,
          });
        }
      )
      .subscribe();
  }

  private handlePriceUpdate(update: PriceUpdate) {
    const tokenHistory = this.priceHistory.get(update.tokenId) || [];
    const lastPrice = tokenHistory.length > 0 ? tokenHistory[tokenHistory.length - 1].price : update.price;
    
    const newDataPoint: ChartDataPoint = {
      time: new Date(update.timestamp).toLocaleTimeString(),
      open: lastPrice,
      close: update.price,
      high: Math.max(lastPrice, update.price),
      low: Math.min(lastPrice, update.price),
      volume: update.volume,
      price: update.price,
    };

    // Keep last 24 data points
    if (tokenHistory.length >= 24) {
      tokenHistory.shift();
    }
    tokenHistory.push(newDataPoint);
    this.priceHistory.set(update.tokenId, tokenHistory);

    // Notify listeners
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

  public unsubscribeFromPrice(tokenId: string, callback: (price: number) => void) {
    const tokenListeners = this.listeners.get(tokenId);
    if (tokenListeners) {
      const index = tokenListeners.indexOf(callback);
      if (index !== -1) {
        tokenListeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(tokenId: string, price: number) {
    this.listeners.get(tokenId)?.forEach(callback => callback(price));
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
      .from('trade_history')
      .select('*')
      .eq('token_id', tokenId)
      .order('created_at', { ascending: true })
      .limit(24);

    if (trades && trades.length > 0) {
      // Convert trade history to chart data points
      const chartData = trades.map((trade: TokenTrade) => ({
        time: new Date(trade.created_at).toLocaleTimeString(),
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
    return this.priceHistory.get(tokenId) || this.generateInitialChartData(tokenId);
  }

  private generateInitialChartData(tokenId: string): ChartDataPoint[] {
    const data = [];
    const basePrice = this.initialPrices.get(tokenId) || 100; // Use initial price or default
    let price = basePrice;

    // Generate flat price history when no trades exist
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - (23 - i));
      
      data.push({
        time: timestamp.toLocaleTimeString(),
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
  const asks = [];
  const bids = [];

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
  initialPrice: number
) => {
  const priceManager = PriceManager.getInstance();
  priceManager.setInitialPrice(tokenId, initialPrice);
  priceManager.subscribeToPrice(tokenId, callback);
};

export const unsubscribeFromPriceUpdates = (
  tokenId: string,
  callback: (price: number) => void
) => {
  const priceManager = PriceManager.getInstance();
  priceManager.unsubscribeFromPrice(tokenId, callback);
};


export const updateTokenPrice = async (
  tokenId: string, 
  previousPrice: number, 
  tradeAmount: number, 
  tradeType: 'buy' | 'sell'
): Promise<number> => {
  // Calculate price impact based on trade size
  // This is a simple implementation - you might want to adjust the formula
  const priceImpact = (tradeAmount / 10000) * 0.01; // 0.01% impact per 10,000 tokens
  
  // Calculate new price
  const priceChange = previousPrice * priceImpact;
  const newPrice = tradeType === 'buy' 
    ? previousPrice * (1 + priceImpact)  // Price increases when buying
    : previousPrice * (1 - priceImpact); // Price decreases when selling

  // Update price manager
  const priceManager = PriceManager.getInstance();
  await priceManager.setInitialPrice(tokenId, newPrice);

  return newPrice;
};

export const getTokenChartData = async (tokenId: string, initialPrice: number): Promise<ChartDataPoint[]> => {
  const priceManager = PriceManager.getInstance();
  await priceManager.setInitialPrice(tokenId, initialPrice);
  return priceManager.getChartData(tokenId);
};
