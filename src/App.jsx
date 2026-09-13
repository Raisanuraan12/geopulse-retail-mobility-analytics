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
            Mobility
          </a>

          <a href="#" className="nav-item">
            <span>📈</span>
            Analytics
          </a>

          <a href="#" className="nav-item">
            <span>🚗</span>
            Traffic
          </a>

          <a href="#" className="nav-item">
            <span>🗺️</span>
            Locations
          </a>

          <a href="#" className="nav-item">
            <span>⚙️</span>
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to GeoPulse Retail Mobility Analytics</p>
          </div>

          <div className="user-profile">
            <div className="avatar">N</div>
            <span>Nikhil</span>
          </div>
        </header>

        {/* Dashboard Cards */}
        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🚶</span>
            <div>
              <p>Total Mobility</p>
              <h2>--</h2>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">🚗</span>
            <div>
              <p>Total Traffic</p>
              <h2>--</h2>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">📍</span>
            <div>
              <p>Active Locations</p>
              <h2>--</h2>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">📈</span>
            <div>
              <p>Analytics</p>
              <h2>--</h2>
            </div>
          </div>
        </section>

        {/* Welcome Section */}
        <section className="welcome-card">
          <h2>GeoPulse Analytics</h2>
          <p>
            Monitor retail mobility, traffic patterns and location-based
            analytics from one centralized dashboard.
          </p>

          <button>View Analytics</button>
        </section>
      </main>
    </div>
  );
}

export default App;