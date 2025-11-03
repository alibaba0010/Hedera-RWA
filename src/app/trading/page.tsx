import { Navbar } from "@/layouts/Navbar";
import { TradingContent } from "./TradingContent";

export default function TradingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <TradingContent />
      </main>
    </div>
  );
}
