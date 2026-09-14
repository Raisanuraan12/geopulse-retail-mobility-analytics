import "./App.css";

function App() {
  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <h2>GeoPulse</h2>
          <span>Retail Mobility Analytics</span>
        </div>

        <nav className="navigation">
          <a href="#" className="nav-item active">
            <span>📊</span>
            Dashboard
          </a>

          <a href="#" className="nav-item">
            <span>📍</span>
            Mobility Map
          </a>

          <a href="#" className="nav-item">
            <span>🏪</span>
            Stores
          </a>

          <a href="#" className="nav-item">
            <span>📈</span>
            Analytics
          </a>

          <a href="#" className="nav-item">
            <span>🔄</span>
            Cannibalization
          </a>

          <a href="#" className="nav-item">
            <span>⚙️</span>
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>
              Monitor retail mobility and location-based analytics
            </p>
          </div>

          <div className="user-profile">
            <div className="avatar">N</div>
            <div>
              <strong>Nikhil</strong>
              <small>Frontend Analyst</small>
            </div>
          </div>
        </header>

        {/* Statistics */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🚶</div>

            <div>
              <p>Total GPS Pings</p>
              <h2>--</h2>
              <span className="stat-label">Mobility data</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏪</div>

            <div>
              <p>Active Stores</p>
              <h2>--</h2>
              <span className="stat-label">Retail locations</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>

            <div>
              <p>Total Visitors</p>
              <h2>--</h2>
              <span className="stat-label">Estimated footfall</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📍</div>

            <div>
              <p>High Traffic Areas</p>
              <h2>--</h2>
              <span className="stat-label">Priority locations</span>
            </div>
          </div>
        </section>

        {/* Main Dashboard Grid */}
        <section className="dashboard-grid">
          {/* Mobility Overview */}
          <div className="dashboard-card mobility-card">
            <div className="card-header">
              <div>
                <h3>Mobility Overview</h3>
                <p>Hyper-local movement activity</p>
              </div>

              <button className="view-button">
                View Map
              </button>
            </div>

            <div className="map-placeholder">
              <div className="map-content">
                <span className="map-icon">🗺️</span>
                <h3>Mobility Map</h3>
                <p>
                  Interactive geospatial visualization will appear here.
                </p>
              </div>
            </div>
          </div>

          {/* Footfall */}
          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Footfall Activity</h3>
                <p>Visitor activity by time</p>
              </div>
            </div>

            <div className="chart-placeholder">
              <div className="chart-bars">
                <div className="bar bar-1"></div>
                <div className="bar bar-2"></div>
                <div className="bar bar-3"></div>
                <div className="bar bar-4"></div>
                <div className="bar bar-5"></div>
                <div className="bar bar-6"></div>
                <div className="bar bar-7"></div>
              </div>

              <div className="chart-labels">
                <span>6 AM</span>
                <span>9 AM</span>
                <span>12 PM</span>
                <span>3 PM</span>
                <span>6 PM</span>
                <span>9 PM</span>
              </div>
            </div>
          </div>
        </section>

        {/* Store Performance */}
        <section className="dashboard-card store-card">
          <div className="card-header">
            <div>
              <h3>Store Performance</h3>
              <p>Top retail locations by visitor activity</p>
            </div>

            <button className="view-button">
              View Stores
            </button>
          </div>

          <div className="store-table">
            <div className="table-header">
              <span>Store</span>
              <span>Location</span>
              <span>Visitors</span>
              <span>Traffic</span>
            </div>

            <div className="table-row">
              <span>Store A</span>
              <span>Downtown</span>
              <span>--</span>
              <span className="traffic high">High</span>
            </div>

            <div className="table-row">
              <span>Store B</span>
              <span>Central Market</span>
              <span>--</span>
              <span className="traffic medium">Medium</span>
            </div>

            <div className="table-row">
              <span>Store C</span>
              <span>North Avenue</span>
              <span>--</span>
              <span className="traffic low">Low</span>
            </div>
          </div>
        </section>

        {/* Insights */}
        <section className="insights-grid">
          <div className="insight-card">
            <span className="insight-icon">📍</span>

            <div>
              <h3>Location Intelligence</h3>
              <p>
                Identify high-traffic areas and potential retail
                opportunities.
              </p>
            </div>
          </div>

          <div className="insight-card">
            <span className="insight-icon">🔄</span>

            <div>
              <h3>Cannibalization Analysis</h3>
              <p>
                Compare traffic overlap between existing and proposed
                stores.
              </p>
            </div>
          </div>

          <div className="insight-card">
            <span className="insight-icon">📊</span>

            <div>
              <h3>Footfall Analytics</h3>
              <p>
                Understand visitor patterns across different times
                and locations.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;