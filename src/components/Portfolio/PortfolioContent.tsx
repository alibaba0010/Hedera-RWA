import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Building,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
// import { AssetDetail } from "../components/asset-detail";
import { useNavigate } from "react-router-dom";
import { WalletContext } from "@/contexts/WalletContext";
import { useContext } from "react";

const portfolioData = {
  totalValue: "$45,230.50",
  totalGain: "+$3,420.75",
  gainPercentage: "+8.2%",
  monthlyIncome: "$1,245.30",
  properties: 8,
  tokens: 15420,
};

const holdings = [
  {
    id: 1,
    name: "Manhattan Luxury Apartment",
    location: "New York, NY",
    tokens: 2500,
    value: "$15,750.00",
    gain: "+$1,250.00",
    gainPercent: "+8.6%",
    yield: "7.2%",
    lastDividend: "$180.00",
    nextDividend: "2024-02-15",
  },
  {
    id: 2,
    name: "Miami Beach Condo",
    location: "Miami, FL",
    tokens: 1800,
    value: "$12,420.00",
    gain: "+$920.00",
    gainPercent: "+8.0%",
    yield: "8.5%",
    lastDividend: "$153.00",
    nextDividend: "2024-02-20",
  },
  {
    id: 3,
    name: "Austin Residential Complex",
    location: "Austin, TX",
    tokens: 3200,
    value: "$17,060.50",
    gain: "+$1,250.75",
    gainPercent: "+7.9%",
    yield: "9.1%",
    lastDividend: "$291.20",
    nextDividend: "2024-02-10",
  },
];

export function PortfolioContent() {
  const { accountId } = useContext(WalletContext);

  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Track your real estate investments and earnings
          </p>
        </div>
        {!accountId ? (
          ""
        ) : (
          <Button onClick={() => navigate("/add-asset")} variant="default" className="pointer">
            + Add Asset
          </Button>
        )}
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
            <div className="text-2xl font-bold">{portfolioData.totalValue}</div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {portfolioData.totalGain} ({portfolioData.gainPercentage})
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
              {portfolioData.monthlyIncome}
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
            <div className="text-2xl font-bold">{portfolioData.properties}</div>
            <p className="text-xs text-muted-foreground">
              Across {portfolioData.tokens.toLocaleString()} tokens
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
          <div className="space-y-6">
            {holdings.map((holding) => (
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
        </CardContent>
      </Card>

      {/* Recent Dividends */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Dividend Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {holdings.map((holding) => (
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
    </div>
  );
}
