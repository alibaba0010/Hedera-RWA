import { TradingContent } from "@/components/TradingContent";
import { Navbar } from "../layouts/Navbar";

export function TradingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <TradingContent />
      </main>
    </div>
  );
}
