import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

import API_BASE_URL from "../services/api";

const MOBILITY_API_URL =
  `${API_BASE_URL}/mobility/points?limit=1000`;

const STORE_API_URL =
  `${API_BASE_URL}/snowflake/stores?limit=1000`;

const ACTIVITY_RADIUS_METERS = 500;

function calculateDistanceMeters(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const earthRadius = 6371000;

  const toRadians = (value) =>
    (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}

function Dashboard() {
  const [points, setPoints] = useState([]);
  const [stores, setStores] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const fetchDashboardData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [
          mobilityResponse,
          storesResponse
        ] = await Promise.all([
          fetch(MOBILITY_API_URL),
          fetch(STORE_API_URL)
        ]);

        if (!mobilityResponse.ok) {
          throw new Error(
            `Mobility API error: ${mobilityResponse.status}`
          );
        }

        if (!storesResponse.ok) {
          if (
            storesResponse.status === 503
          ) {
            throw new Error(
              "Store API is unavailable. Snowflake data is currently not configured."
            );
          }

          throw new Error(
            `Store API error: ${storesResponse.status}`
          );
        }

        const mobilityData =
          await mobilityResponse.json();

        const storesData =
          await storesResponse.json();

        if (
          mobilityData.status !==
            "success" ||
          !Array.isArray(
            mobilityData.points
          )
        ) {
          throw new Error(
            "Invalid mobility API response."
          );
        }

        if (
          storesData.status !==
            "success" ||
          !Array.isArray(
            storesData.stores
          )
        ) {
          throw new Error(
            "Invalid store API response."
          );
        }

        const validPoints =
          mobilityData.points.filter(
            (point) =>
              Number.isFinite(
                Number(point.latitude)
              ) &&
              Number.isFinite(
                Number(point.longitude)
              )
          );

        const validStores =
          storesData.stores.filter(
            (store) =>
              Number.isFinite(
                Number(store.latitude)
              ) &&
              Number.isFinite(
                Number(store.longitude)
              )
          );

        setPoints(
          validPoints.map((point) => ({
            ...point,
            latitude: Number(
              point.latitude
            ),
            longitude: Number(
              point.longitude
            )
          }))
        );

        setStores(
          validStores.map((store) => ({
            ...store,
            latitude: Number(
              store.latitude
            ),
            longitude: Number(
              store.longitude
            )
          }))
        );
      } catch (err) {
        setError(
          err.message ||
            "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const storeActivity =
    useMemo(() => {
      return stores
        .map((store) => {
          let nearbyActivity = 0;

          points.forEach((point) => {
            const distance =
              calculateDistanceMeters(
                store.latitude,
                store.longitude,
                point.latitude,
                point.longitude
              );

            if (
              distance <=
              ACTIVITY_RADIUS_METERS
            ) {
              nearbyActivity += 1;
            }
          });

          return {
            storeId: store.store_id,
            storeName:
              store.store_name,
            nearbyActivity
          };
        })
        .sort(
          (a, b) =>
            b.nearbyActivity -
            a.nearbyActivity
        );
    }, [stores, points]);

  const totalGpsPings =
    points.length;

  const activeStores =
    stores.length;

  const totalNearbyActivity =
    storeActivity.reduce(
      (total, store) =>
        total +
        store.nearbyActivity,
      0
    );

  const highActivityStores =
    storeActivity.filter(
      (store) =>
        store.nearbyActivity > 0
    ).length;

  const chartData =
    storeActivity
      .slice(0, 8)
      .map((store) => ({
        name:
          String(
            store.storeName
          ).length > 16
            ? `${String(
                store.storeName
              ).slice(0, 16)}...`
            : store.storeName,
        activity:
          store.nearbyActivity
      }));

  return (
    <div className="dashboard-page">

      <div className="page-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Hyper-Local Retail Mobility
            Analytics
          </p>
        </div>

        <button
          className={`refresh-map-button ${
            loading
              ? "is-loading"
              : ""
          }`}
          onClick={
            fetchDashboardData
          }
          disabled={loading}
        >
          <span className="refresh-map-icon">
            ↻
          </span>

          <span>
            {loading
              ? "Refreshing..."
              : "Refresh Dashboard"}
          </span>
        </button>
      </div>

      {error && (
        <div className="dashboard-error">
          <strong>
            Dashboard data unavailable
          </strong>

          <p>{error}</p>

          <button
            className="retry-button"
            onClick={
              fetchDashboardData
            }
          >
            Retry
          </button>
        </div>
      )}

      <div className="stats-grid">

        <div className="stat-card">
          <span>
            Total GPS Pings
          </span>

          <strong>
            {loading
              ? "..."
              : totalGpsPings}
          </strong>

          <small>
            Mobility API
          </small>
        </div>

        <div className="stat-card">
          <span>
            Active Stores
          </span>

          <strong>
            {loading
              ? "..."
              : activeStores}
          </strong>

          <small>
            Store locations
          </small>
        </div>

        <div className="stat-card">
          <span>
            Nearby GPS Activity
          </span>

          <strong>
            {loading
              ? "..."
              : totalNearbyActivity}
          </strong>

          <small>
            Within 500m of stores
          </small>
        </div>

        <div className="stat-card">
          <span>
            Stores With Activity
          </span>

          <strong>
            {loading
              ? "..."
              : highActivityStores}
          </strong>

          <small>
            Derived mobility metric
          </small>
        </div>

      </div>

      <div className="dashboard-grid">

        <div className="dashboard-panel">

          <div className="dashboard-panel-header">
            <div>
              <h2>
                Store Mobility Activity
              </h2>

              <p>
                GPS activity detected
                within 500 meters of
                each store.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="dashboard-empty">
              Loading store activity...
            </div>
          ) : chartData.length === 0 ? (
            <div className="dashboard-empty">
              No store activity data
              available.
            </div>
          ) : (
            <div className="dashboard-chart">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={chartData}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="activity"
                    name="GPS Activity"
                  />
                </BarChart>
              </ResponsiveContainer>

            </div>
          )}

        </div>

        <div className="dashboard-panel">

          <div className="dashboard-panel-header">
            <div>
              <h2>
                Top Store Activity
              </h2>

              <p>
                Stores ranked by nearby
                GPS activity.
              </p>
            </div>
          </div>

          <div className="dashboard-store-list">

            {storeActivity
              .slice(0, 5)
              .map((store, index) => (
                <div
                  className="dashboard-store-row"
                  key={store.storeId}
                >
                  <div>
                    <span className="store-rank">
                      #{index + 1}
                    </span>

                    <strong>
                      {store.storeName}
                    </strong>

                    <small>
                      ID:{" "}
                      {store.storeId}
                    </small>
                  </div>

                  <strong>
                    {
                      store.nearbyActivity
                    }
                  </strong>
                </div>
              ))}

            {!loading &&
              storeActivity.length ===
                0 && (
                <div className="dashboard-empty">
                  No stores available.
                </div>
              )}

          </div>

        </div>

      </div>

      <div className="dashboard-insights">

        <div className="insight-card">
          <span>
            Mobility Coverage
          </span>

          <strong>
            {totalGpsPings > 0
              ? "Available"
              : "No Data"}
          </strong>

          <p>
            Real GPS mobility data
            is connected to the
            dashboard.
          </p>
        </div>

        <div className="insight-card">
          <span>
            Store Coverage
          </span>

          <strong>
            {activeStores > 0
              ? "Available"
              : "No Data"}
          </strong>

          <p>
            Store locations are
            loaded from the Store
            API.
          </p>
        </div>

        <div className="insight-card">
          <span>
            Activity Analysis
          </span>

          <strong>
            500m Radius
          </strong>

          <p>
            Nearby GPS activity is
            calculated around each
            store.
          </p>
        </div>

      </div>

      <div className="dashboard-note">
        Dashboard metrics are derived
        from available mobility and
        store-location data. GPS activity
        should not be interpreted as an
        exact visitor count.
      </div>

    </div>
  );
}

export default Dashboard;