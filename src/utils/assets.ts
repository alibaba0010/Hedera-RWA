export interface Asset {
  id: string;
  metadataCID: string;
  metadata?: any;
}
export interface AssetMetadata {
  name: string;
  description: string;
  category: string;
  location: {
    country: string;
    state: string;
    city: string;
  };
  files: {
    primaryImage?: {
      cid: string;
      hash: string;
    };
    additionalImages?: Array<{
      cid: string;
      hash: string;
    }>;
    legalDocs?: {
      cid: string;
      hash: string;
    };
    valuationReport?: {
      cid: string;
      hash: string;
    };
  };
  tokenomics: {
    assetValue: number;
    tokenSupply: number;
    projectedIncome: number;
    annualIncome: number;
    pricePerTokenUSD: number;
    dividendYield: number;
    payoutFrequency: string;
    nextPayout: string;
  };
  tokenConfig: {
    name: string;
    symbol: string;
    decimals: number;
    supplyType: string;
  };
  additionalInfo: {
    insuranceDetails: string;
    specialRights: string;
  };
  createdAt: string;
  owner: string;
}
export interface TradingPanelProps {
  tokenomics: {
    pricePerTokenUSD: number;
    tokenSupply: number;
    assetValue: number;
    dividendYield: number;
  };
  tokenSymbol: string;
  tokenId: string; // Add this line
}
