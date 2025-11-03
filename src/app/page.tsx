import { HeroSection } from "@/layouts/HeroSection";
import { Navbar } from "@/layouts/Navbar";
import { StatsSection } from "./trading/StatsSection";
import { AssetGrid } from "@/layouts/AssetGrid";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <AssetGrid />
      </main>
    </div>
  );
}
