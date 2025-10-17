import { StatsSection } from "@/app/trading/StatsSection";
import { AssetGrid } from "../layouts/AssetGrid";
import { HeroSection } from "../layouts/HeroSection";
import { Navbar } from "../layouts/Navbar";

export function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <AssetGrid />
      </main>
    </div>
  );
}
