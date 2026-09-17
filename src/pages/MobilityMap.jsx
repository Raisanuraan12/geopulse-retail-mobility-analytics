function MobilityMap() {
  return (
    <div className="mobility-page">

      {/* Page Introduction */}
      <div className="page-intro">
        <div>
          <h2>Mobility Map</h2>
          <p>
            Explore hyper-local mobility patterns, foot traffic,
            and high-traffic retail zones.
          </p>
        </div>

        <button className="map-button">
          Refresh Map
        </button>
      </div>


      {/* Mobility Summary */}
      <div className="mobility-stats">

        <div className="mobility-stat-card">
          <span className="mobility-stat-icon">⌖</span>

          <div>
            <p>Total GPS Pings</p>
            <h3>--</h3>
          </div>
        </div>

        <div className="mobility-stat-card">
          <span className="mobility-stat-icon">◉</span>

          <div>
            <p>Active Zones</p>
            <h3>--</h3>
          </div>
        </div>

        <div className="mobility-stat-card">
          <span className="mobility-stat-icon">↑</span>

          <div>
            <p>High Traffic Zones</p>
            <h3>--</h3>
          </div>
        </div>

        <div className="mobility-stat-card">
          <span className="mobility-stat-icon">▤</span>

          <div>
            <p>Nearby Stores</p>
            <h3>--</h3>
          </div>
        </div>

      </div>


      {/* Map Section */}
      <div className="map-card">

        <div className="map-card-header">
          <div>
            <h3>Retail Mobility Overview</h3>
            <p>
              Geographic visualization of anonymized mobility activity
            </p>
          </div>

          <div className="map-status">
            <span className="status-dot"></span>
            Map Ready
          </div>
        </div>


        {/* Map Placeholder */}
        <div className="mobility-map">

          <div className="map-placeholder-content">

            <div className="large-map-icon">⌖</div>

            <h2>Interactive Mobility Map</h2>

            <p>
              Map visualization will display GPS mobility,
              footfall intensity, store locations, and traffic zones.
            </p>

            <button className="map-button">
              Load Map
            </button>

          </div>


          {/* Map Grid Decoration */}
          <div className="map-grid"></div>

        </div>


        {/* Map Legend */}
        <div className="map-legend">

          <h4>Traffic Intensity</h4>

          <div className="legend-items">

            <div className="legend-item">
              <span className="legend-dot low"></span>
              Low Traffic
            </div>

            <div className="legend-item">
              <span className="legend-dot medium"></span>
              Medium Traffic
            </div>

            <div className="legend-item">
              <span className="legend-dot high"></span>
              High Traffic
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default MobilityMap;