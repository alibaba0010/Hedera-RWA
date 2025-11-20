import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Building,
  Calendar,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
// import { AssetDetail } from "../components/asset-detail";
import { useNavigate } from "react-router-dom";
import { WalletContext } from "@/contexts/WalletContext";
import { useContext, useEffect, useState } from "react";
import { fetchDataFromDatabase } from "@/utils/supabase";
import { AssetMetadata } from "@/utils/assets";

const portfolioData = {
  totalValue: "$45,230.50",
  totalGain: "+$3,420.75",
  gainPercentage: "+8.2%",
  monthlyIncome: "$1,245.30",
  properties: 8,
  tokens: 15420,
};

interface HoldingData {
  id: string;
  name: string;
  location: string;
  tokens: number;
  value: string;
  gain: string;
  gainPercent: string;
  yield: string;
  lastDividend: string;
  nextDividend: string;
  metadata?: AssetMetadata;
}

export function PortfolioContent() {
  const { accountId, connectWallet } = useContext(WalletContext);
  const navigate = useNavigate();
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [portfolioHoldings, setPortfolioHoldings] = useState<HoldingData[]>([]);
  const [calculatedPortfolioData, setCalculatedPortfolioData] =
    useState(portfolioData);

  useEffect(() => {
    if (accountId) {
      loadPortfolioData();
    }
  }, [accountId]);

  const loadPortfolioData = async () => {
    try {
      setLoadingAssets(true);
      const assets = await fetchDataFromDatabase();

      if (assets && Array.isArray(assets)) {
        // Transform assets into holdings format
        const transformedHoldings: HoldingData[] = assets
          .filter((asset: any) => asset.owner === accountId)
          .map((asset: any, index: number) => {
            const metadata = asset.metadata || {};
            const tokenomics = metadata.tokenomics || {};
            const location = metadata.location || {};

            return {
              id: asset.tokenId || asset.id || `asset-${index}`,
              name: metadata.name || "Unknown Asset",
              location: `${location.city || "City"}, ${
                location.state || "State"
              }`,
              tokens: tokenomics.tokenSupply || 0,
              value: `$${(tokenomics.assetValue || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              gain: `+$${(tokenomics.projectedIncome || 0).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}`,
              gainPercent: "+8.0%", // Can be calculated from actual data
              yield: `${(tokenomics.dividendYield || 0).toFixed(1)}%`,
              lastDividend: `$${(
                (tokenomics.annualIncome || 0) / 12
              ).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              nextDividend: tokenomics.nextPayout || "2024-02-15",
              metadata,
            };
          });

        setPortfolioHoldings(transformedHoldings);

        // Calculate portfolio totals
        const totalValue = transformedHoldings.reduce(
          (sum, holding) =>
            sum + parseFloat(holding.value.replace(/[$,]/g, "")),
          0
        );
        const totalIncome = transformedHoldings.reduce(
          (sum, holding) =>
            sum + parseFloat(holding.lastDividend.replace(/[$,]/g, "")),
          0
        );
        const averageYield =
          transformedHoldings.length > 0
            ? (
                transformedHoldings.reduce(
                  (sum, holding) =>
                    sum + parseFloat(holding.yield.replace("%", "")),
                  0
                ) / transformedHoldings.length
              ).toFixed(1)
            : "0.0";

        setCalculatedPortfolioData({
          totalValue: `$${totalValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          totalGain: `+$${(totalValue * 0.08).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          gainPercentage: "+8.2%",
          monthlyIncome: `$${(totalIncome * 12).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          properties: transformedHoldings.length,
          tokens: transformedHoldings.reduce((sum, h) => sum + h.tokens, 0),
        });
      }
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    } finally {
      setLoadingAssets(false);
    }
  };

  if (!accountId) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground mt-2">
              Track your real estate investments and earnings
            </p>
          </div>
        </div>

        {/* Connect Wallet Overlay */}
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Connect your wallet to view your portfolio, track investments,
                and manage your real estate tokens.
              </p>
              <Button
                onClick={connectWallet}
                className="w-full h-12 text-base"
                size="lg"
              >
                <Wallet className="h-5 w-5 mr-2" />
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Track your real estate investments and earnings
          </p>
        </div>
        <Button
          onClick={() => navigate("/add-asset")}
          variant="default"
          className="pointer"
        >
          + Add Asset
        </Button>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Portfolio Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculatedPortfolioData.totalValue}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {calculatedPortfolioData.totalGain} (
              {calculatedPortfolioData.gainPercentage})
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Income
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculatedPortfolioData.monthlyIncome}
            </div>
            <p className="text-xs text-muted-foreground">
              From dividend payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Properties Owned
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculatedPortfolioData.properties}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {calculatedPortfolioData.tokens.toLocaleString()} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.3%</div>
            <p className="text-xs text-muted-foreground">
              Annual percentage yield
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Your Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAssets ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading your holdings...</p>
            </div>
          ) : portfolioHoldings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No holdings yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Start by adding your first real estate asset
              </p>
              <Button onClick={() => navigate("/add-asset")} variant="default">
                + Add Your First Asset
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {portfolioHoldings.map((holding) => (
                <div
                  key={holding.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{holding.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {holding.location}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Tokens Owned
                        </p>
                        <p className="font-medium">
                          {holding.tokens.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Current Value
                        </p>
                        <p className="font-medium">{holding.value}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Gain
                        </p>
                        <p className="font-medium text-green-600">
                          {holding.gain}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Yield</p>
                        <Badge variant="secondary">{holding.yield}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="text-green-600">
                      {holding.gainPercent}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      Trade
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Dividends */}
      {portfolioHoldings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Dividend Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioHoldings.map((holding) => (
                <div
                  key={holding.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{holding.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Monthly dividend payment
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">
                      {holding.lastDividend}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Next: {holding.nextDividend}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
