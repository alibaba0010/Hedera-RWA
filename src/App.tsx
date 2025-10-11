import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { TradingPage } from "./pages/TradingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AddAssetPage } from "./pages/AddAssetPage";
import Marketplace from "./pages/Marketplace";
import { AssetDetailsPage } from "./pages/AssetDetailsPage";

function App() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route
          path="/marketplace/:metadataCID"
          element={<AssetDetailsPage />}
        />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/trading" element={<TradingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/add-asset" element={<AddAssetPage />} />
      </Routes>
    </div>
  );
}

export default App;

