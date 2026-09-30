import API_BASE_URL from "../services/api";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";

const STORE_API_URL =
  `${API_BASE_URL}/snowflake/stores?limit=1000`;

const MOBILITY_API_URL =
  `${API_BASE_URL}/mobility/points?limit=1000`;

const PERFORMANCE_RADIUS_METERS = 500;


// Calculate distance between two GPS coordinates
function calculateDistanceMeters(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadius = 6371000;

  const lat1 = Number(latitude1);
  const lon1 = Number(longitude1);
  const lat2 = Number(latitude2);
  const lon2 = Number(longitude2);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const lat1Radians =
    (lat1 * Math.PI) / 180;

  const lat2Radians =
    (lat2 * Math.PI) / 180;

  const deltaLatitude =
    ((lat2 - lat1) * Math.PI) / 180;

  const deltaLongitude =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatitude / 2) *
      Math.sin(deltaLatitude / 2) +
    Math.cos(lat1Radians) *
      Math.cos(lat2Radians) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


function Stores() {

  const navigate = useNavigate();

  const [stores, setStores] =
    useState([]);

  const [mobilityPoints, setMobilityPoints] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // Fetch store data
  const fetchStores = useCallback(
    async (signal) => {

      const response =
        await fetch(
          STORE_API_URL,
          { signal }
        );

      if (!response.ok) {

        if (response.status === 503) {

          throw new Error(
            "The Store API is temporarily unavailable. " +
            "The backend or Snowflake connection may not be ready."
          );

        }

        throw new Error(
          `Store API request failed: HTTP ${response.status}`
        );

      }

      const data =
        await response.json();

      if (
        data.status !== "success" ||
        !Array.isArray(data.stores)
      ) {

        throw new Error(
          "Invalid response received from the Store API."
        );

      }

      return data.stores
        .filter(
          (store) =>
            store &&
            store.store_id !== null &&
            store.store_id !== undefined
        )
        .map((store) => ({
          store_id:
            store.store_id,

          store_name:
            store.store_name ??
            "Unnamed Store",

          latitude:
            store.latitude,

          longitude:
            store.longitude
        }));

    },
    []
  );


  // Fetch mobility data
  const fetchMobilityPoints =
    useCallback(
      async (signal) => {

        const response =
          await fetch(
            MOBILITY_API_URL,
            { signal }
          );

        if (!response.ok) {

          throw new Error(
            `Mobility API request failed: HTTP ${response.status}`
          );

        }

        const data =
          await response.json();

        if (
          !Array.isArray(data.points)
        ) {

          throw new Error(
            "Invalid response received from the Mobility API."
          );

        }

        return data.points.filter(
          (point) => {

            const latitude =
              Number(
                point.latitude
              );

            const longitude =
              Number(
                point.longitude
              );

            return (
              Number.isFinite(latitude) &&
              Number.isFinite(longitude) &&
              latitude >= -90 &&
              latitude <= 90 &&
              longitude >= -180 &&
              longitude <= 180
            );

          }
        );

      },
      []
    );


  // Fetch both APIs
  const fetchStorePerformance =
    useCallback(
      async (signal) => {

        try {

          setLoading(true);

          setError("");


          const [
            storeData,
            mobilityData
          ] = await Promise.all([
            fetchStores(signal),
            fetchMobilityPoints(signal)
          ]);


          setStores(
            storeData
          );

          setMobilityPoints(
            mobilityData
          );

        } catch (err) {

          if (
            err.name ===
            "AbortError"
          ) {
            return;
          }

          console.error(
            "Store Performance API Error:",
            err
          );

          setError(
            err instanceof TypeError
              ? "Cannot connect to the backend APIs. " +
                "Check that the backend is running and reachable."
              : err.message
          );

          setStores([]);

          setMobilityPoints([]);

        } finally {

          if (
            !signal?.aborted
          ) {

            setLoading(false);

          }

        }

      },
      [
        fetchStores,
        fetchMobilityPoints
      ]
    );


  // Load data on page open
  useEffect(() => {

    const controller =
      new AbortController();

    fetchStorePerformance(
      controller.signal
    );

    return () => {
      controller.abort();
    };

  }, [
    fetchStorePerformance
  ]);


  // Search stores
  const filteredStores =
    useMemo(() => {

      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return stores;
      }

      return stores.filter(
        (store) => {

          const id =
            String(
              store.store_id
            ).toLowerCase();

          const name =
            String(
              store.store_name
            ).toLowerCase();

          return (
            id.includes(search) ||
            name.includes(search)
          );

        }
      );

    }, [
      stores,
      searchTerm
    ]);


  // Calculate store performance
  const storePerformance =
    useMemo(() => {

      return filteredStores.map(
        (store) => {

          const latitude =
            Number(
              store.latitude
            );

          const longitude =
            Number(
              store.longitude
            );


          if (
            !Number.isFinite(
              latitude
            ) ||
            !Number.isFinite(
              longitude
            )
          ) {

            return {
              ...store,
              nearbyGpsActivity: 0,
              mapped: false
            };

          }


          let nearbyCount = 0;


          mobilityPoints.forEach(
            (point) => {

              const distance =
                calculateDistanceMeters(
                  latitude,
                  longitude,
                  point.latitude,
                  point.longitude
                );


              if (
                distance !== null &&
                distance <=
                  PERFORMANCE_RADIUS_METERS
              ) {

                nearbyCount += 1;

              }

            }
          );


          return {
            ...store,

            nearbyGpsActivity:
              nearbyCount,

            mapped: true
          };

        }
      );

    }, [
      filteredStores,
      mobilityPoints
    ]);


  // Number of mapped stores
  const mappedLocations =
    useMemo(() => {

      return stores.filter(
        (store) => {

          const latitude =
            Number(
              store.latitude
            );

          const longitude =
            Number(
              store.longitude
            );

          return (
            Number.isFinite(
              latitude
            ) &&
            Number.isFinite(
              longitude
            ) &&
            latitude >= -90 &&
            latitude <= 90 &&
            longitude >= -180 &&
            longitude <= 180
          );

        }
      ).length;

    }, [stores]);


  // Total nearby GPS activity
  const totalNearbyActivity =
    useMemo(() => {

      return storePerformance.reduce(
        (total, store) =>
          total +
          store.nearbyGpsActivity,
        0
      );

    }, [storePerformance]);


  const formatCoordinate =
    (value) => {

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {

        return "N/A";

      }

      const number =
        Number(value);

      return Number.isFinite(
        number
      )
        ? number.toFixed(6)
        : "N/A";

    };


  return (

    <div className="stores-page">


      {/* Page Introduction */}

      <div className="page-intro">

        <div>

          <h2>
            Stores
          </h2>

          <p>
            Explore retail store locations
            and nearby mobility activity
            monitored by GeoPulse.
          </p>

        </div>


        <button
          className="map-button"
          onClick={() => {

            const controller =
              new AbortController();

            fetchStorePerformance(
              controller.signal
            );

          }}
          disabled={loading}
        >

          {loading
            ? "Loading..."
            : "Refresh Stores"}

        </button>

      </div>


      {/* Store Summary */}

      <div className="mobility-stats">


        {/* Total Stores */}

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ▤
          </span>

          <div>

            <p>
              Total Stores
            </p>

            <h3>
              {loading || error
                ? "--"
                : stores.length}
            </h3>

          </div>

        </div>


        {/* Displayed Stores */}

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ◉
          </span>

          <div>

            <p>
              Displayed Stores
            </p>

            <h3>
              {loading || error
                ? "--"
                : filteredStores.length}
            </h3>

          </div>

        </div>


        {/* Mapped Locations */}

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ⌖
          </span>

          <div>

            <p>
              Mapped Locations
            </p>

            <h3>
              {loading || error
                ? "--"
                : mappedLocations}
            </h3>

          </div>

        </div>


        {/* Nearby Activity */}

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ↑
          </span>

          <div>

            <p>
              Nearby GPS Activity
            </p>

            <h3>
              {loading || error
                ? "--"
                : totalNearbyActivity}
            </h3>

          </div>

        </div>

      </div>


      {/* Store List */}

      <div className="stores-card">


        <div className="stores-card-header">

          <div>

            <h3>
              Store Performance
            </h3>

            <p>
              Store locations and nearby GPS
              mobility activity within 500 meters.
            </p>

          </div>


          {/* Search */}

          <input
            type="search"
            placeholder="Search by Store ID or Name..."
            aria-label="Search stores"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            className="store-search"
          />

        </div>


        {/* Loading */}

        {loading && (

          <div className="store-message">

            <h3>
              Loading Store Performance...
            </h3>

            <p>
              Fetching store and mobility
              data from the backend.
            </p>

          </div>

        )}


        {/* Error */}

        {!loading &&
          error && (

            <div className="store-error">

              <strong>
                Store Performance API Error
              </strong>

              <p>
                {error}
              </p>

              <button
                className="store-view-button"
                onClick={() => {

                  const controller =
                    new AbortController();

                  fetchStorePerformance(
                    controller.signal
                  );

                }}
              >
                Try Again
              </button>

            </div>

          )}


        {/* Empty */}

        {!loading &&
          !error &&
          stores.length === 0 && (

            <div className="store-message">

              <h3>
                No Stores Found
              </h3>

              <p>
                No store records were
                returned by the backend.
              </p>

            </div>

          )}


        {/* Search Empty */}

        {!loading &&
          !error &&
          stores.length > 0 &&
          storePerformance.length === 0 && (

            <div className="store-message">

              <h3>
                No Matching Stores
              </h3>

              <p>
                No stores match
                "{searchTerm}".
              </p>

              <button
                className="store-view-button"
                onClick={() =>
                  setSearchTerm("")
                }
              >
                Clear Search
              </button>

            </div>

          )}


        {/* Performance Table */}

        {!loading &&
          !error &&
          storePerformance.length > 0 && (

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
                      Nearby GPS Activity
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {storePerformance.map(
                    (store) => (

                      <tr
                        key={
                          String(
                            store.store_id
                          )
                        }
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
                          {formatCoordinate(
                            store.latitude
                          )}
                        </td>


                        <td>
                          {formatCoordinate(
                            store.longitude
                          )}
                        </td>


                        <td>

                          <strong
                            className={
                              store.nearbyGpsActivity >
                              0
                                ? "store-activity-value"
                                : "store-activity-zero"
                            }
                          >
                            {
                              store.nearbyGpsActivity
                            }
                          </strong>

                        </td>


                        <td>

                          <button
                            className="store-view-button"
                            onClick={() =>
                              navigate(
                                `/store-details/${encodeURIComponent(
                                  String(
                                    store.store_id
                                  )
                                )}`
                              )
                            }
                          >
                            View
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

      </div>


    </div>

  );

}


export default Stores;