import { useEffect, useState } from "react";

const STORE_API_URL =
  "http://127.0.0.1:8000/snowflake/stores?limit=1000";

function Stores() {
  const [stores, setStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch stores from backend
  const fetchStores = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(STORE_API_URL);

      if (!response.ok) {
        throw new Error(
          `Store API request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      // Backend response:
      // {
      //   status: "success",
      //   source: "snowflake",
      //   count: 0,
      //   stores: [...]
      // }

      if (!Array.isArray(data.stores)) {
        throw new Error(
          "Invalid Store API response: stores array not found."
        );
      }

      setStores(data.stores);
    } catch (err) {
      console.error("Store API Error:", err);

      setError(
        "Unable to load store data from the backend."
      );

      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  // Load stores when page opens
  useEffect(() => {
    fetchStores();
  }, []);

  // Frontend search
  const filteredStores = stores.filter((store) => {
    const search = searchTerm.toLowerCase();

    return (
      String(store.store_id || "")
        .toLowerCase()
        .includes(search) ||
      String(store.store_name || "")
        .toLowerCase()
        .includes(search)
    );
  });

  return (
    <div className="stores-page">

      {/* Page Introduction */}

      <div className="page-intro">

        <div>
          <h2>Stores</h2>

          <p>
            Explore retail store locations monitored by
            GeoPulse.
          </p>
        </div>

        <button
          className="map-button"
          onClick={fetchStores}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh Stores"}
        </button>

      </div>


      {/* Store Summary */}

      <div className="mobility-stats">

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ▤
          </span>

          <div>
            <p>Total Stores</p>

            <h3>
              {loading ? "--" : stores.length}
            </h3>
          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ◉
          </span>

          <div>
            <p>Displayed Stores</p>

            <h3>
              {loading ? "--" : filteredStores.length}
            </h3>
          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ⌖
          </span>

          <div>
            <p>Mapped Locations</p>

            <h3>
              {loading
                ? "--"
                : stores.filter(
                    (store) =>
                      Number.isFinite(
                        Number(store.latitude)
                      ) &&
                      Number.isFinite(
                        Number(store.longitude)
                      )
                  ).length}
            </h3>
          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ↑
          </span>

          <div>
            <p>Store Analytics</p>

            <h3>--</h3>
          </div>

        </div>

      </div>


      {/* Store List */}

      <div className="stores-card">

        <div className="stores-card-header">

          <div>
            <h3>
              Store Locations
            </h3>

            <p>
              Retail locations received from the backend
              Store API.
            </p>
          </div>


          {/* Search */}

          <input
            type="text"
            placeholder="Search stores..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            className="store-search"
          />

        </div>


        {/* Loading State */}

        {loading && (

          <div
            style={{
              padding: "50px",
              textAlign: "center"
            }}
          >
            <h3>
              Loading Stores...
            </h3>

            <p>
              Fetching store data from the backend.
            </p>
          </div>

        )}


        {/* Error State */}

        {!loading && error && (

          <div
            style={{
              margin: "20px",
              padding: "18px",
              borderRadius: "8px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c"
            }}
          >

            <strong>
              Store API Error
            </strong>

            <p style={{ marginTop: "6px" }}>
              {error}
            </p>

            <button
              className="store-view-button"
              onClick={fetchStores}
            >
              Try Again
            </button>

          </div>

        )}


        {/* Empty State */}

        {!loading &&
          !error &&
          stores.length === 0 && (

            <div
              style={{
                padding: "50px",
                textAlign: "center"
              }}
            >

              <h3>
                No Stores Found
              </h3>

              <p>
                No store data is currently available
                from the backend.
              </p>

            </div>

          )}


        {/* Search Empty State */}

        {!loading &&
          !error &&
          stores.length > 0 &&
          filteredStores.length === 0 && (

            <div
              style={{
                padding: "50px",
                textAlign: "center"
              }}
            >

              <h3>
                No Matching Stores
              </h3>

              <p>
                No stores match "{searchTerm}".
              </p>

            </div>

          )}


        {/* Store Table */}

        {!loading &&
          !error &&
          filteredStores.length > 0 && (

            <div className="stores-table-container">

              <table className="stores-table">

                <thead>

                  <tr>

                    <th>
                      Store ID
                    </th>

                    <th>
                      Store Name
                    </th>

                    <th>
                      Latitude
                    </th>

                    <th>
                      Longitude
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredStores.map((store) => (

                    <tr
                      key={store.store_id}
                    >

                      <td>
                        <strong>
                          {store.store_id}
                        </strong>
                      </td>


                      <td>
                        {store.store_name}
                      </td>


                      <td>
                        {store.latitude}
                      </td>


                      <td>
                        {store.longitude}
                      </td>


                      <td>

                        <button
                          className="store-view-button"
                          onClick={() => {
                            alert(
                              `Store: ${store.store_name}\nStore ID: ${store.store_id}\nLatitude: ${store.latitude}\nLongitude: ${store.longitude}`
                            );
                          }}
                        >
                          View
                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

      </div>

    </div>
  );
}

export default Stores;