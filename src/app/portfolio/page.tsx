import { PortfolioContent } from "@/components/Portfolio/PortfolioContent";
import { Navbar } from "@/layouts/Navbar";

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <PortfolioContent />
      </main>
    </div>
  );
}
