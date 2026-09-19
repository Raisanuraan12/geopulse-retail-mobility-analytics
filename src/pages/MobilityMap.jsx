import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
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


// Backend API
const API_URL =
  "http://127.0.0.1:8000/mobility/points?limit=1000";


// Automatically fit map to real GPS points
function MapBounds({ points }) {

  const map = useMap();

  useEffect(() => {

    if (!points || points.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(
      points.map((point) => [
        Number(point.latitude),
        Number(point.longitude)
      ])
    );

    map.fitBounds(bounds, {
      padding: [40, 40]
    });

  }, [points, map]);

  return null;
}


function MobilityMap() {

  const [points, setPoints] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // Fetch real mobility data
  const fetchMobilityPoints = async () => {

    try {

      setLoading(true);

      setError("");


      const response = await fetch(API_URL);


      if (!response.ok) {

        throw new Error(
          `API request failed with status ${response.status}`
        );

      }


      const data = await response.json();


      // Backend response:
      // {
      //   status: "success",
      //   count: 5,
      //   points: [...]
      // }

      if (!Array.isArray(data.points)) {

        throw new Error(
          "Invalid mobility API response: points array not found."
        );

      }


      // Keep only valid GPS points
      const validPoints = data.points.filter(
        (point) =>
          point &&
          Number.isFinite(Number(point.latitude)) &&
          Number.isFinite(Number(point.longitude))
      );


      setPoints(validPoints);

    } catch (err) {

      console.error(
        "Mobility Points API Error:",
        err
      );

      setError(
        "Unable to load mobility points from the backend."
      );

      setPoints([]);

    } finally {

      setLoading(false);

    }

  };


  // Load mobility points when page opens
  useEffect(() => {

    fetchMobilityPoints();

  }, []);


  // Use first real GPS point as initial map center
  const mapCenter =
    points.length > 0
      ? [
          Number(points[0].latitude),
          Number(points[0].longitude)
        ]
      : null;


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


        <button
          className="map-button"
          onClick={fetchMobilityPoints}
          disabled={loading}
        >

          {loading ? "Loading..." : "Refresh Map"}

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

            <h3>
              {loading ? "--" : points.length}
            </h3>

          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ◉
          </span>

          <div>

            <p>Active Zones</p>

            <h3>
              --
            </h3>

          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ↑
          </span>

          <div>

            <p>High Traffic Zones</p>

            <h3>
              --
            </h3>

          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ▤
          </span>

          <div>

            <p>Nearby Stores</p>

            <h3>
              --
            </h3>

          </div>

        </div>

      </div>


      {/* Map Card */}

      <div className="map-card">

        <div className="map-card-header">

          <div>

            <h3>
              Retail Mobility Overview
            </h3>

            <p>
              Interactive visualization of mobility activity
              and retail locations
            </p>

          </div>


          <div className="map-status">

            <span className="status-dot"></span>

            {loading
              ? "Loading Map"
              : error
              ? "API Error"
              : "Live Map"}

          </div>

        </div>


        {/* API Error */}

        {error && (

          <div
            style={{
              padding: "15px",
              margin: "15px",
              borderRadius: "8px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c"
            }}
          >

            <strong>
              Mobility API Error
            </strong>

            <p style={{ marginTop: "5px" }}>
              {error}
            </p>

          </div>

        )}


        {/* Interactive Map */}

        <div className="mobility-map">

          {/* Loading State */}

          {loading && (

            <div
              style={{
                height: "100%",
                minHeight: "500px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8fafc"
              }}
            >

              <div style={{ textAlign: "center" }}>

                <h3>
                  Loading Mobility Data...
                </h3>

                <p>
                  Fetching GPS points from backend.
                </p>

              </div>

            </div>

          )}


          {/* Empty State */}

          {!loading &&
            !error &&
            points.length === 0 && (

              <div
                style={{
                  height: "100%",
                  minHeight: "500px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f8fafc"
                }}
              >

                <div style={{ textAlign: "center" }}>

                  <h3>
                    No Mobility Points Found
                  </h3>

                  <p>
                    The backend returned no GPS points.
                  </p>

                </div>

              </div>

            )}


          {/* Real Leaflet Map */}

          {!loading &&
            !error &&
            points.length > 0 &&
            mapCenter && (

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


                {/* Automatically fit all GPS points */}

                <MapBounds
                  points={points}
                />


                {/* Real Backend GPS Points */}

                {points.map((point, index) => (

                  <Marker
                    key={
                      `${point.device_id}-${point.timestamp}-${index}`
                    }
                    position={[
                      Number(point.latitude),
                      Number(point.longitude)
                    ]}
                  >

                    <Popup>

                      <strong>
                        Mobility Point
                      </strong>

                      <br />

                      <strong>
                        Device ID:
                      </strong>{" "}
                      {point.device_id}

                      <br />

                      <strong>
                        Latitude:
                      </strong>{" "}
                      {point.latitude}

                      <br />

                      <strong>
                        Longitude:
                      </strong>{" "}
                      {point.longitude}

                      <br />

                      <strong>
                        Timestamp:
                      </strong>{" "}

                      {point.timestamp
                        ? new Date(
                            point.timestamp
                          ).toLocaleString()
                        : "N/A"}

                    </Popup>

                  </Marker>

                ))}

              </MapContainer>

            )}


          {/* Map Overlay */}

          {!loading &&
            !error &&
            points.length > 0 && (

              <div className="map-overlay">

                <strong>
                  Mobility Analysis Area
                </strong>

                <span>
                  {points.length} GPS points loaded
                </span>

              </div>

            )}

        </div>


        {/* Map Legend */}

        <div className="map-legend">

          <h4>
            Traffic Intensity
          </h4>


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