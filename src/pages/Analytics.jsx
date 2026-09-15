import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { getHourlyFootfall } from "../services/mobilityApi";

function Analytics() {
  const [footfall, setFootfall] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFootfall() {
      try {
        const response = await getHourlyFootfall();
        setFootfall(response.footfall);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadFootfall();
  }, []);

  if (loading) {
    return <p>Loading mobility analytics...</p>;
  }

  if (error) {
    return <p>Unable to load analytics: {error}</p>;
  }

  return (
    <div>
      <h1>Mobility Analytics</h1>
      <p>Hourly footfall activity from GeoPulse GPS mobility data.</p>

      <div style={{ width: "100%", height: 420 }}>
        <ResponsiveContainer>
          <LineChart data={footfall}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="hour" />

            <YAxis />

            <Tooltip />

            <Legend />

            <Line
              type="monotone"
              dataKey="total_pings"
              name="Total Pings"
            />

            <Line
              type="monotone"
              dataKey="unique_devices"
              name="Unique Devices"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Analytics;