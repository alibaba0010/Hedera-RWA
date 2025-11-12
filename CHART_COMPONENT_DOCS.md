# Trading Chart Component Documentation

## Overview

A comprehensive, production-ready chart component system for the Hedera RWA trading platform. Built with React, Recharts, and TypeScript, featuring candlestick charts, line charts, multiple timeframes, and technical indicators.

## Features

### Core Functionality

- ✅ **Multiple Chart Types**: Candlestick and Line charts
- ✅ **Timeframe Selection**: 1m, 5m, 15m, 1h, 4h, 1d, 1w
- ✅ **Real-time Price Updates**: Live price change tracking
- ✅ **Technical Indicators**:
  - Simple Moving Averages (SMA 20, 50, 200)
  - Relative Strength Index (RSI)
  - Bollinger Bands
  - MACD (Moving Average Convergence Divergence)
- ✅ **Responsive Design**: Adapts to all screen sizes
- ✅ **Dark Theme**: Trading-optimized UI
- ✅ **Price Statistics**: High, Low, Average, Current price display
- ✅ **Tooltips & Legends**: Interactive data visualization

## Component Structure

```
src/components/Trading/
├── TradingChart.tsx           # Main chart component
├── ChartControls.tsx          # Control panel for chart settings
└── ChartIndicators.tsx        # Technical indicator calculations

src/utils/
└── chartUtils.ts              # Data transformation & utilities
```

## Components

### 1. TradingChart.tsx

Main chart component that renders OHLC data with interactive controls.

#### Props

```typescript
interface TradingChartProps {
  data?: OHLC[]; // OHLC data points (auto-generated if not provided)
  title?: string; // Chart title (default: "Price Chart")
  tokenSymbol?: string; // Token symbol for display (default: "TOKEN")
  height?: number; // Chart height in pixels (default: 400)
  onPriceChange?: (price: number) => void; // Callback for price updates
}
```

#### Features

- Automatic data aggregation based on selected timeframe
- Multiple chart type support (candlestick/line)
- Dynamic indicator rendering
- Responsive container with auto-resize
- Separated sub-charts for RSI and MACD

#### Usage

```tsx
import { TradingChart } from "@/components/Trading/TradingChart";

export function MyComponent() {
  const handlePriceChange = (price: number) => {
    console.log("Current price:", price);
  };

  return (
    <TradingChart
      title="BTC/USD"
      tokenSymbol="BTC"
      height={500}
      onPriceChange={handlePriceChange}
    />
  );
}
```

### 2. ChartControls.tsx

Interactive control panel for chart settings.

#### Features

- Timeframe selection buttons
- Chart type toggle (candlestick/line)
- Indicator selection dropdown
- Active indicators display with color coding
- Refresh button

#### Props

```typescript
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
```

### 3. ChartIndicators.tsx

Technical indicator calculation functions.

#### Supported Indicators

**1. Simple Moving Average (SMA)**

```typescript
calculateSMA(data, period): IndicatorPoint[]
```

- Standard exponential smoothing
- Periods: 20, 50, 200

**2. Relative Strength Index (RSI)**

```typescript
calculateRSI(data, period = 14): IndicatorPoint[]
```

- Standard RSI formula with 14-period default
- Values 0-100
- Overbought > 70, Oversold < 30

**3. Bollinger Bands**

```typescript
calculateBollingerBands(data, period = 20, stdDev = 2): {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}
```

- Upper band: SMA + (2 × StdDev)
- Middle band: SMA
- Lower band: SMA - (2 × StdDev)

**4. MACD**

```typescript
calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
}
```

- MACD Line: EMA(12) - EMA(26)
- Signal Line: EMA(9) of MACD
- Histogram: MACD - Signal

## Utilities (chartUtils.ts)

### Data Types

```typescript
interface OHLC {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type TimeFrame = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";
```

### Key Functions

**1. Timeframe Aggregation**

```typescript
aggregateOHLC(data: OHLC[], fromFrame: TimeFrame, toFrame: TimeFrame): OHLC[]
```

Aggregates OHLC data from one timeframe to another.

**2. Price Statistics**

```typescript
getPriceStats(data: OHLC[]): {
  highest: number;
  lowest: number;
  average: number;
  latest: number;
}
```

**3. Price Change Calculation**

```typescript
calculatePriceChange(oldPrice: number, newPrice: number): number
```

Returns percentage change.

**4. Mock Data Generation**

```typescript
generateMockOHLC(count: number = 100, startPrice: number = 100, volatility: number = 0.02): OHLC[]
```

Generates realistic mock OHLC data for testing.

**5. Data Validation**

```typescript
validateOHLC(data: OHLC[]): boolean
```

Validates OHLC data integrity.

## Integration with TradingPanel

The TradingChart is integrated into TradingPanel with automatic data flow:

```tsx
// In TradingPanel.tsx
<TradingChart
  data={chartData}
  title={`${tokenSymbol}/USDC Price Chart`}
  tokenSymbol={tokenSymbol}
  height={400}
  onPriceChange={handlePriceUpdate}
/>
```

Data flow:

1. Chart data is generated/aggregated based on timeframe
2. Price updates trigger `handlePriceUpdate` callback
3. Order book and order list are refreshed
4. UI updates with new price information

## Styling

The chart uses Tailwind CSS with a dark trading theme:

- **Background**: Gray-900 / Gray-950
- **Text**: Gray-400 / White
- **Positive Change**: Green-400
- **Negative Change**: Red-400
- **Indicators**: Blue, Purple, Pink, Cyan, Amber, Emerald

## Performance Considerations

1. **Memoization**: Chart data is memoized to prevent unnecessary recalculations
2. **Responsive Container**: Uses ResponsiveContainer for optimal rendering
3. **Data Aggregation**: Efficiently converts between timeframes
4. **Indicator Caching**: Indicators are recalculated only when data or settings change
5. **Animation Disabled**: Animations disabled for better performance

## Usage Examples

### Basic Usage

```tsx
import { TradingChart } from "@/components/Trading/TradingChart";

export function BasicChart() {
  return <TradingChart title="Price Chart" />;
}
```

### With Custom Data

```tsx
import { TradingChart } from "@/components/Trading/TradingChart";
import { generateMockOHLC } from "@/utils/chartUtils";

export function CustomChart() {
  const data = generateMockOHLC(200, 150, 0.03);

  return (
    <TradingChart
      data={data}
      title="Bitcoin Price"
      tokenSymbol="BTC"
      height={600}
    />
  );
}
```

### With Price Change Handler

```tsx
import { TradingChart } from "@/components/Trading/TradingChart";
import { useState } from "react";

export function ChartWithHandler() {
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  return (
    <div>
      <div className="text-lg font-bold mb-4">
        Current: ${currentPrice.toFixed(8)}
      </div>
      <TradingChart title="Trading View" onPriceChange={setCurrentPrice} />
    </div>
  );
}
```

## Dependencies

- `recharts`: ^3.1.2 (Chart rendering)
- `react`: ^19.1.0
- `tailwindcss`: ^3.x (Styling)
- `lightweight-charts`: ^5.0.9 (Optional, for advanced features)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

- Semantic HTML structure
- Keyboard navigation support via Recharts
- Color contrast ratios meet WCAG AA standards
- Tooltips provide additional context

## Future Enhancements

- [ ] Volume bars on main chart
- [ ] Custom indicator builder
- [ ] Drawing tools (trend lines, support/resistance)
- [ ] Alert system for indicator signals
- [ ] Export chart as image/PDF
- [ ] Advanced candlestick patterns detection
- [ ] Heatmap visualization
- [ ] Multiple timeframe analysis
- [ ] Order execution from chart
- [ ] Historical data persistence

## Troubleshooting

### Chart Not Rendering

Ensure:

- Data is properly formatted as OHLC array
- `recharts` is installed
- Container div has defined width/height

### Indicator Calculations Not Accurate

- Verify data has sufficient points (RSI needs > 14 candles)
- Check data is chronologically ordered
- Validate OHLC data with `validateOHLC()`

### Performance Issues

- Reduce data points by using larger timeframes
- Disable unnecessary indicators
- Use `height` prop < 800px

## License

MIT - Part of Hedera RWA Trading Platform
