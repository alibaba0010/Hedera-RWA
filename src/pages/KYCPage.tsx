import { KYCContent } from "@/components/KYC/KYCContent";
import { Navbar } from "../layouts/Navbar";

export function KYCPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <KYCContent />
      </main>
    </div>
  );
}
