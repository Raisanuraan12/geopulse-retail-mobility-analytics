import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import { getMobilityDashboard } from "../services/mobilityApi";
function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await getMobilityDashboard();
        setDashboard(response.dashboard);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);
  if (loading) {
    return <p>Loading GeoPulse dashboard...</p>;
  }
  if (error) {
    return <p>Unable to connect to backend: {error}</p>;
  }
  return (
    <div className="dashboard">
      <div className="stats-grid">
        <StatCard
          title="Total GPS Pings"
          value={dashboard.summary.total_pings}
          description="Mobile location signals"
          icon="GPS"
        />
        <StatCard
          title="Active Stores"
          value={dashboard.summary.active_stores}
          description="Currently monitored stores"
          icon="STORE"
        />
        <StatCard
          title="Total Visitors"
          value={dashboard.summary.total_devices}
          description="Unique anonymized devices"
          icon="USER"
        />
        <StatCard
          title="Peak Traffic"
          value={dashboard.peak_traffic.hour}
          description={`${dashboard.peak_traffic.total_pings} pings`}
          icon="PEAK"
        />
      </div>
      <div className="dashboard-welcome">
        <h2>Welcome to GeoPulse</h2>
        <p>
          GeoPulse provides hyper-local retail mobility analytics
          using anonymized location and foot-traffic data.
        </p>
        <p>
          Busiest Period: {dashboard.insights.busiest_period} | Quietest Period:{" "}
          {dashboard.insights.quietest_period}
        </p>
      </div>
    </div>
  );
}
export default Dashboard;
