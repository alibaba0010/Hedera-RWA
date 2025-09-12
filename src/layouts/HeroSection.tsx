import { ArrowRight, Building, Users, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { WalletContext } from "@/contexts/WalletContext";
import { useContext } from "react";

export function HeroSection() {
  const { accountId, connectWallet, connectEvmWallet } =
    useContext(WalletContext);
  return (
    <section className="relative py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Tokenize Real Estate on Hedera
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Invest in fractional real estate ownership through blockchain
            technology. Buy, sell, and earn dividends from premium properties
            with complete transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {accountId ? (
              <Button size="lg" className="text-lg px-8" asChild>
                <Link to="/portfolio">
                  Explore Properties
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="text-lg px-8"
                onClick={connectWallet}
              >
                <Wallet className="ml-2 h-5 w-5" />
                Connect Wallet
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 bg-transparent"
            >
              Learn More
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Building className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Properties</h3>
              <p className="text-muted-foreground">
                Carefully vetted real estate assets from prime locations
                worldwide
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Fractional Ownership
              </h3>
              <p className="text-muted-foreground">
                Own a piece of high-value properties with minimal investment
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Automated Returns</h3>
              <p className="text-muted-foreground">
                Receive rental income and dividends automatically via smart
                contracts
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
