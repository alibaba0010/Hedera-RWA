import { Navbar } from "@/layouts/Navbar";
import { SettingsContent } from "./SettingsContent";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <SettingsContent />
      </main>
    </div>
  );
}
