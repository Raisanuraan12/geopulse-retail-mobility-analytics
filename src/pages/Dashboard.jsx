import { useEffect, useState } from "react";
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
    <div>
      <h1>GeoPulse Dashboard</h1>
      <p>Real-time retail mobility analytics from the GeoPulse backend.</p>

      <div>
        <h3>Total Devices</h3>
        <p>{dashboard.summary.total_devices}</p>
      </div>

      <div>
        <h3>Total GPS Pings</h3>
        <p>{dashboard.summary.total_pings}</p>
      </div>

      <div>
        <h3>Active Stores</h3>
        <p>{dashboard.summary.active_stores}</p>
      </div>

      <div>
        <h3>Peak Traffic</h3>
        <p>
          {dashboard.peak_traffic.hour} —{" "}
          {dashboard.peak_traffic.total_pings} pings
        </p>
      </div>

      <div>
        <h3>Busiest Period</h3>
        <p>{dashboard.insights.busiest_period}</p>
      </div>

      <div>
        <h3>Quietest Period</h3>
        <p>{dashboard.insights.quietest_period}</p>
      </div>
    </div>
  );
}

export default Dashboard;