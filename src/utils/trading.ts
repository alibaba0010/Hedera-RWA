export const generateCandlestickData = (currentPrice: number) => {
  const data = [];
  let price = currentPrice * 0.9;

  for (let i = 0; i < 24; i++) {
    const open = price;
    const variation = (Math.random() - 0.5) * 0.05;
    const close = open + open * variation;
    const high =
      Math.max(open, close) + Math.abs(open * (Math.random() * 0.02));
    const low = Math.min(open, close) - Math.abs(open * (Math.random() * 0.02));
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      time: `${String(i).padStart(2, "0")}:00`,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
      volume,
      price: Number(close.toFixed(4)),
    });

    price = close;
  }

  return data;
};

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
