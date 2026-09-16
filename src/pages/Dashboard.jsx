import StatCard from "../components/StatCard";

function Dashboard() {
  return (
    <div className="dashboard">

      {/* Statistics Cards */}
      <div className="stats-grid">

        <StatCard
          title="Total GPS Pings"
          value="--"
          description="Mobile location signals"
          icon="⌖"
        />

        <StatCard
          title="Active Stores"
          value="--"
          description="Currently monitored stores"
          icon="▤"
        />

        <StatCard
          title="Total Visitors"
          value="--"
          description="Estimated foot traffic"
          icon="◉"
        />

        <StatCard
          title="High Traffic Areas"
          value="--"
          description="High mobility zones"
          icon="↑"
        />

      </div>

      {/* Welcome Section */}
      <div className="dashboard-welcome">

        <h2>Welcome to GeoPulse</h2>

        <p>
          GeoPulse provides hyper-local retail mobility analytics
          using anonymized location and foot-traffic data.
        </p>

      </div>

    </div>
  );
}

export default Dashboard;