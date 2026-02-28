import AddAssetForm from "@/components/AddAsset/AddAssetForm";
import { Navbar } from "../layouts/Navbar";

export function AddAssetPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <AddAssetForm />
      </main>
    </div>
  );
}
