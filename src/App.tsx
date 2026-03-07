import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { TradingPage } from "./pages/TradingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AddAssetPage } from "./pages/AddAssetPage";
import Marketplace from "./pages/Marketplace";
import { AssetDetailsPage } from "./pages/AssetDetailsPage";
import { KYCPage } from "./pages/KYCPage";
import { GovernancePage } from "./pages/GovernancePage";

import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
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
          <Route path="/kyc" element={<KYCPage />} />
          <Route path="/governance" element={<GovernancePage />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
