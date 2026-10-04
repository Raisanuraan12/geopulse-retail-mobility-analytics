import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import Dashboard from "./pages/Dashboard";
import MobilityMap from "./pages/MobilityMap";
import Stores from "./pages/Stores";
import Analytics from "./pages/Analytics";
import Cannibalization from "./pages/Cannibalization";
import StoreDetails from "./pages/StoresDetails";
import Settings from "./pages/Settings";

import "./App.css";

function AppLayout({ children, title }) {
  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content">
        <Header title={title} />
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={
            <AppLayout title="Dashboard">
              <Dashboard />
            </AppLayout>
          }
        />

        <Route
          path="/dashboard"
          element={
            <AppLayout title="Dashboard">
              <Dashboard />
            </AppLayout>
          }
        />

        <Route
          path="/mobility-map"
          element={
            <AppLayout title="Mobility Map">
              <MobilityMap />
            </AppLayout>
          }
        />

        <Route
          path="/stores"
          element={
            <AppLayout title="Stores">
              <Stores />
            </AppLayout>
          }
        />

        <Route
          path="/analytics"
          element={
            <AppLayout title="Analytics">
              <Analytics />
            </AppLayout>
          }
        />

        <Route
          path="/cannibalization"
          element={
            <AppLayout title="Cannibalization Analysis">
              <Cannibalization />
            </AppLayout>
          }
        />

        <Route
          path="/store-details"
          element={
            <AppLayout title="Store Details">
              <StoreDetails />
            </AppLayout>
          }
        />

        <Route
          path="/settings"
          element={
            <AppLayout title="Settings">
              <Settings />
            </AppLayout>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;