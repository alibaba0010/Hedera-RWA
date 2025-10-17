import { SettingsContent } from "@/app/settings/SettingsContent";
import { Navbar } from "../layouts/Navbar";

export function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <SettingsContent />
      </main>
    </div>
  );
}
