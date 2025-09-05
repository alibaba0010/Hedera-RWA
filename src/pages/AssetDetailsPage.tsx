import AssetDetails from "@/components/Marketplace/AssetDetails";
import { Navbar } from "../layouts/Navbar";

export function AssetDetailsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <AssetDetails />
      </main>
    </div>
  );
}
