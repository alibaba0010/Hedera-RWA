# Hedera Real World Asset (RWA) Marketplace

A decentralized marketplace for tokenized real estate assets built on the Hedera network. This platform enables users to fractionalize, trade, and invest in real world assets (RWAs) through blockchain-based tokens, all while maintaining regulatory compliance and transparency.

**Submitted for: Hedera DeFi Hackathon**

---

## 🎯 Project Overview

The Hedera RWA Marketplace is a full-stack decentralized application that bridges traditional real estate with blockchain technology. Users can:

- **Tokenize Real Estate Assets**: Convert physical properties into divisible, tradeable tokens
- **Fractional Ownership**: Own shares of premium properties without needing to purchase entire assets
- **Secondary Market Trading**: Buy and sell real estate tokens in real-time with dynamic pricing
- **Asset Management**: Access comprehensive asset details, financial metrics, and historical data
- **Portfolio Tracking**: Monitor holdings and performance across multiple properties
- **Smart Contract Integration**: Execute trades and manage ownership through Hedera Token Service (HTS)

---

## 🏗️ Architecture & Tech Stack

### Frontend

- **Framework**: React 19 + Vite (TypeScript)
- **UI Components**: Shadcn/UI (Tailwind CSS, Radix UI)
- **Charts**: Lightweight Charts (TradingView), Recharts
- **State Management**: React Context API, React Query
- **Wallet Integration**: WalletConnect, MetaMask (EVM), Hedera Wallet Connect

### Backend & Infrastructure

- **Blockchain**: Hedera Consensus Service (HCS), Hedera Token Service (HTS)
- **Database**: Supabase (PostgreSQL)
- **Storage**: IPFS (InterPlanetary File System)
- **Smart Contracts**: Hedera SDK (JavaScript/TypeScript)
- **Authentication**: Hedera Wallet Connect, EVM wallets

### Key Integrations

- Hedera Mirror Node (REST API)
- IPFS Gateway (ipfs.io)
- Supabase Realtime (WebSocket subscriptions)

---

## 🚀 Key Features

### 1. Asset Tokenization

- Upload property documentation (legal docs, valuations, images)
- Store metadata on IPFS for decentralization
- Create fungible tokens via Hedera Token Service
- Set tokenomics (supply, price, dividend yield)
- Register assets in the marketplace

### 2. Real-Time Trading

- **Live Price Updates**: Subscribe to real-time price changes via Supabase
- **Dynamic Order Book**: Generated orderbook updates with live prices
- **Market & Limit Orders**: Buy/sell at market or set custom prices
- **Trading Pairs**: Support for HBAR and USDC trading pairs
- **Instant Settlement**: On-chain settlement via Hedera transfers

### 3. Asset Discovery

- Browse all tokenized properties
- Filter by category, location, and tokenomics
- View detailed asset information with images and documents
- Analyze financial metrics (yield, payout frequency, market cap)

### 4. Portfolio Management

- Track personal token holdings
- Monitor unrealized gains/losses
- View order history and execution details
- Access dividend payout information

### 5. Smart Order Management

- View all marketplace orders in real-time
- Cancel pending orders
- Track order status (pending, completed, failed)
- Search and filter orders

---

## 📋 Project Structure

```
Hedera-RWA/
├── src/
│   ├── app/                          # Next.js app pages
│   │   ├── page.tsx                  # Home/Dashboard
│   │   ├── trading/
│   │   │   ├── page.tsx              # Trading page
│   │   │   └── TradingContent.tsx    # Trading UI with asset selector
│   │   ├── portfolio/
│   │   │   └── page.tsx              # Portfolio view
│   │   ├── settings/
│   │   │   └── page.tsx              # User settings
│   ├── components/
│   │   ├── Marketplace/
│   │   │   ├── AssetDetails.tsx      # Asset detail view with TradingPanel
│   │   │   ├── TradingPanel.tsx      # Trading interface for specific assets
│   │   │   ├── Orders.tsx            # Real-time orders display
│   │   │   ├── Marketplace.tsx       # Asset browsing
│   │   │   └── LimitOrder.tsx        # Limit order creation
│   │   ├── Trading/
│   │   │   ├── TradingChart.tsx      # Lightweight Charts integration
│   │   │   └── ChartControls.tsx     # Chart indicators/timeframes
│   │   ├── Add-Asset/
│   │   │   ├── AddAssetForm.tsx      # Asset creation form
│   │   │   ├── FileUploader.tsx      # IPFS file upload
│   │   │   └── LocationSelector.tsx  # Geolocation picker
│   │   ├── wallet/
│   │   │   ├── EvmWalletConnectButton.tsx
│   │   │   └── WalletTypeSelector.tsx
│   │   └── ui/                       # Reusable UI components
│   ├── contexts/
│   │   ├── WalletContext.tsx         # Wallet state & logic
│   │   ├── theme-context.tsx         # Dark/light mode
│   │   ├── notification-context.tsx  # Toast notifications
│   │   └── Providers.tsx             # Provider wrapper
│   ├── hooks/
│   │   ├── useEvmWallet.ts           # EVM wallet integration
│   │   ├── walletConnect.ts          # WalletConnect logic
│   │   └── accountBalance.ts         # Account balance queries
│   ├── utils/
│   │   ├── hedera-integration.ts     # Hedera SDK wrappers
│   │   ├── trading.ts                # Price updates, orderbook generation
│   │   ├── token-association.ts      # Token association management
│   │   ├── order-hedera-integration.ts # Order settlement
│   │   ├── supabase.ts               # Database queries
│   │   ├── assets.ts                 # Type definitions
│   │   └── mirror-node-client.ts     # Mirror Node REST client
│   ├── layouts/
│   │   ├── Navbar.tsx                # Navigation bar
│   │   ├── HeroSection.tsx           # Landing hero
│   │   └── TokenConfigCard.tsx       # Asset config display
│   ├── pages/
│   │   └── [Asset page wrappers]
│   ├── App.tsx                       # Root React component
│   ├── main.tsx                      # React DOM entry
│   └── index.css                     # Global styles
├── public/                           # Static assets
├── package.json                      # Dependencies
├── vite.config.ts                    # Vite configuration
├── tailwind.config.js                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
└── README.md                         # This file
```

---

## 🔄 Data Flow

### Asset Creation Flow

1. Creator uploads property documents, images to IPFS via `FileUploader`
2. Metadata (location, tokenomics, files) stored in IPFS
3. Metadata CID + tokenId saved to Supabase `asset_metadata` table
4. Creator creates Hedera token via `createHederaToken()`
5. Asset appears in marketplace

### Trading Flow

1. User selects asset from dropdown in `TradingContent`
2. Asset metadata fetched from IPFS and enriched
3. Historical price data retrieved via `getTokenChartData()`
4. Subscribe to real-time price updates via `subscribeToPriceUpdates()`
5. Order book generated with `generateOrderBook(currentPrice)`
6. User places order → validated → executed via `buyAssetToken()` / `sellAssetToken()`
7. Trade recorded in Supabase `trade_history` & `orders` tables
8. Price updates trigger chart refresh and orderbook regeneration

### Real-Time Updates

- **Prices**: Supabase `trade_history` table changes trigger `PriceManager` listener callbacks
- **Orders**: Supabase `orders` table changes trigger TradingPanel to re-fetch and update UI
- **Chart**: Price updates append/update candles in real-time

---

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ & npm
- Hedera testnet account (visit [portal.hedera.com](https://portal.hedera.com))
- Supabase project ([supabase.com](https://supabase.com))
- MetaMask or compatible EVM wallet
- Hedera Wallet Connect enabled browser

### Environment Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/alibaba0010/Hedera-RWA.git
   cd Hedera-RWA
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create `.env.local` file** in the project root:

   ```env
   # Hedera Configuration
   VITE_PUBLIC_TREASURY_ACCOUNT_ID=0.0.xxxxx
   VITE_PUBLIC_TREASURY_DER_PRIVATE_KEY=your_treasury_private_key_here

   # Supabase Configuration
   VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

   # IPFS Configuration (using public gateway)
   VITE_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/

   # Other Configuration
   VITE_PUBLIC_HEDERA_NETWORK=testnet
   ```

4. **Set up Supabase Tables**

   Create the following tables in your Supabase project:

   **`asset_metadata`** (stores IPFS references)

   ```sql
   CREATE TABLE asset_metadata (
     id BIGSERIAL PRIMARY KEY,
     metadataCID TEXT NOT NULL UNIQUE,
     tokenId TEXT NOT NULL UNIQUE,
     owner TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

   **`orders`** (marketplace orders)

   ```sql
   CREATE TABLE orders (
     id BIGSERIAL PRIMARY KEY,
     token_id TEXT NOT NULL,
     amount BIGINT NOT NULL,
     price NUMERIC NOT NULL,
     order_type TEXT CHECK (order_type IN ('buy', 'sell')),
     status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
     buyer_id TEXT NOT NULL,
     target_price NUMERIC,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_orders_token ON orders(token_id);
   CREATE INDEX idx_orders_status ON orders(status);
   ```

   **`trade_history`** (executed trades for price updates)

   ```sql
   CREATE TABLE trade_history (
     id BIGSERIAL PRIMARY KEY,
     token_id TEXT NOT NULL,
     price NUMERIC NOT NULL,
     volume BIGINT NOT NULL,
     trade_type TEXT CHECK (trade_type IN ('buy', 'sell')),
     trader_id TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_trades_token ON trade_history(token_id);
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

---

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

Starts Vite dev server with hot module replacement.

### Build for Production

```bash
npm run build
```

Compiles TypeScript and creates optimized production bundle in `dist/`.

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing.

### Linting

```bash
npm run lint
```

Runs ESLint to check code quality.

---

## 💻 Core Smart Functions

### Hedera Integration (`src/utils/hedera-integration.ts`)

**`createHederaToken()`** - Create a new tokenized asset

```typescript
const tokenId = await createHederaToken({
  name: "Manhattan Luxury Apartment",
  symbol: "MHT",
  decimals: 2,
  initialSupply: 10000,
  supplyType: "FINITE",
  maxSupply: 10000,
  accountId: userAccountId,
  signer: userSigner,
});
```

**`buyAssetToken()`** - Execute a buy order

```typescript
const { status } = await buyAssetToken(
  tokenId,
  accountId,
  amount,
  signer,
  tradingPair, // "HBAR" or "USDC"
  totalValue
);
```

**`sellAssetToken()`** - Execute a sell order

```typescript
const { status } = await sellAssetToken(
  tokenId,
  accountId,
  amount,
  signer,
  totalValue
);
```

**`fetchAssetMetadataFromIPFS()`** - Retrieve asset details

```typescript
const metadata = await fetchAssetMetadataFromIPFS(metadataCID);
```

### Trading Utils (`src/utils/trading.ts`)

**`subscribeToPriceUpdates()`** - Subscribe to real-time price changes

```typescript
subscribeToPriceUpdates(
  tokenId,
  (price) => {
    console.log(`New price: $${price}`);
  },
  initialPrice
);
```

**`generateOrderBook()`** - Create realistic orderbook

```typescript
const { asks, bids } = generateOrderBook(currentPrice);
```

**`getTokenChartData()`** - Fetch historical price data

```typescript
const chartPoints = await getTokenChartData(tokenId, initialPrice);
```

---

## 🔐 Security Considerations

1. **Private Key Management**: Treasury private keys stored in `.env.local` (never committed)
2. **Token Association**: Automatic token association before trades
3. **Balance Verification**: Checks sufficient balance before order execution
4. **Signature Verification**: All transactions signed by user's Hedera wallet
5. **IPFS Content Addressing**: Immutable file references via content hash (CID)
6. **Supabase Row-Level Security**: Can be implemented for access control

### Recommendations

- Use environment variables with restricted permissions
- Implement rate limiting on API endpoints
- Add transaction confirmation UI before execution
- Use HD wallets for key management
- Regular security audits for smart contract interactions

---

## 🌐 Deployment

### Vercel (Recommended for Vite)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push to main

**Vercel Configuration (`vercel.json` included)**:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Environment for Testnet vs Mainnet

- **Testnet**: Use Hedera testnet (free test tokens available)
- **Mainnet**: Update `VITE_PUBLIC_HEDERA_NETWORK` to `mainnet`; ensure real funds

---

## 📊 Transaction Costs

**Hedera Transaction Fees (Approximate on Testnet):**

- Token Creation: ~$0.10
- Token Transfer: ~$0.0001
- Token Association: ~$0.05
- HCS Message: ~$0.0001

All prices in USD equivalent; users pay in HBAR.

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create asset with multiple file uploads
- [ ] Browse marketplace and filter assets
- [ ] Subscribe to asset and verify real-time price updates
- [ ] Place limit and market orders
- [ ] Verify orders appear in Orders table in real-time
- [ ] Cancel pending orders
- [ ] Switch between HBAR and USDC trading pairs
- [ ] Check portfolio for holdings
- [ ] Verify wallet connection (Hedera, MetaMask, WalletConnect)

### Known Limitations

- Orderbook generation is simulated (production would use central order matching)
- Price updates depend on trade_history Supabase inserts
- No limit order matching engine (orders created but not auto-matched)

---

## 🐛 Troubleshooting

### "Token Not Associated" Error

**Solution**: The marketplace automatically associates tokens. If error persists, ensure wallet has sufficient HBAR for association fees (~0.05 HBAR).

### No Assets Appearing in Dropdown

**Solution**: Verify `asset_metadata` table in Supabase is populated. Check console for IPFS fetch errors.

### Real-Time Orders Not Updating

**Solution**: Verify Supabase connection and that `orders` table has proper indexes. Check browser console for WebSocket errors.

### Insufficient HBAR Balance

**Solution**: Request test tokens from [Hedera Faucet](https://testnet.hedera.com/faucet).

---

## 📚 Resources

- **Hedera Docs**: [docs.hedera.com](https://docs.hedera.com)
- **HTS (Token Service)**: [Token Service Guide](https://docs.hedera.com/hedera/sdks/tokens)
- **Mirror Node REST API**: [Mirror Node Documentation](https://docs.hedera.com/hedera/mirror-node/rest-api)
- **IPFS Docs**: [ipfs.io](https://ipfs.io)
- **Supabase Realtime**: [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)

---

## 👨‍💼 Team & Contributions

**Developed for**: Hedera DeFi Hackathon  
**Repository**: [github.com/alibaba0010/Hedera-RWA](https://github.com/alibaba0010/Hedera-RWA)

### Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🎓 Learning Resources

This project demonstrates:

- ✅ Hedera Token Service (fungible token creation & transfers)
- ✅ Hedera Consensus Service (topic messaging for price updates)
- ✅ Mirror Node integration for on-chain data queries
- ✅ IPFS for decentralized asset metadata storage
- ✅ Real-time database subscriptions (Supabase WebSocket)
- ✅ EVM wallet integration (MetaMask, WalletConnect)
- ✅ Multi-chain wallet support (Hedera native, EVM)
- ✅ Tokenomics modeling (supply, pricing, dividends)
- ✅ React hooks & context for state management
- ✅ TypeScript for type-safe blockchain interactions

---

## 📞 Support

For issues, questions, or feedback:

- Open an issue on GitHub
- Check existing documentation
- Review Hedera community forums

---

**Happy trading! 🚀**
