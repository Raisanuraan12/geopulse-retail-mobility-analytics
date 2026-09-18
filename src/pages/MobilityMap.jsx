import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import L from "leaflet";


// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});


function MobilityMap() {

  // Temporary map center
  // Real location data will come from the backend later.
  const mapCenter = [17.6599, 75.9064];

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


      {/* Mobility Statistics */}

      <div className="mobility-stats">

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ⌖
          </span>

          <div>
            <p>Total GPS Pings</p>
            <h3>--</h3>
          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ◉
          </span>

          <div>
            <p>Active Zones</p>
            <h3>--</h3>
          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ↑
          </span>

          <div>
            <p>High Traffic Zones</p>
            <h3>--</h3>
          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ▤
          </span>

          <div>
            <p>Nearby Stores</p>
            <h3>--</h3>
          </div>

        </div>

      </div>


      {/* Map Card */}

      <div className="map-card">

        <div className="map-card-header">

          <div>
            <h3>Retail Mobility Overview</h3>

            <p>
              Interactive visualization of mobility activity
              and retail locations
            </p>
          </div>


          <div className="map-status">

            <span className="status-dot"></span>

            Live Map

          </div>

        </div>


        {/* Interactive Map */}

        <div className="mobility-map">

          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={true}
            className="leaflet-map"
          >

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />


            <Marker position={mapCenter}>

              <Popup>

                <strong>GeoPulse Location</strong>

                <br />

                Mobility analysis area

                <br />

                GPS and footfall data will appear here.

              </Popup>

            </Marker>

          </MapContainer>


          {/* Map Overlay */}

          <div className="map-overlay">

            <strong>Mobility Analysis Area</strong>

            <span>
              Interactive Map
            </span>

          </div>

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