import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import MobilityMap from "./pages/MobilityMap";
import Stores from "./pages/Stores";
import Analytics from "./pages/Analytics";
import Cannibalization from "./pages/Cannibalization";
import StoreDetails from "./pages/StoresDetails";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">
            <h2>GeoPulse</h2>
            <span>Retail Mobility Analytics</span>
          </div>

          <nav className="navigation">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <span>📊</span>
              Dashboard
            </NavLink>

            <NavLink
              to="/mobility-map"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <span>📍</span>
              Mobility Map
            </NavLink>

            <NavLink
              to="/stores"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <span>🏪</span>
              Stores
            </NavLink>

            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <span>📈</span>
              Analytics
            </NavLink>

            <NavLink
              to="/cannibalization"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <span>🔄</span>
              Cannibalization
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <span>⚙️</span>
              Settings
            </NavLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mobility-map" element={<MobilityMap />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route
              path="/cannibalization"
              element={<Cannibalization />}
            />
            <Route path="/store-details" element={<StoreDetails />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;