import API_BASE_URL from "../services/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const STORE_API_URL =
  `${API_BASE_URL}/snowflake/stores?limit=1000`;

const MOBILITY_API_URL =
  `${API_BASE_URL}/mobility/points?limit=1000`;

const CANNIBALIZATION_RADIUS_METERS = 1000;


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

  const toRadians = (value) =>
    (value * Math.PI) / 180;

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const deltaLat =
    toRadians(lat2 - lat1);

  const deltaLon =
    toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


// Format distance
function formatDistance(distance) {
  if (distance === null) {
    return "N/A";
  }

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(2)} km`;
}


const CANNIBALIZATION_API_URL =
  `${API_BASE_URL}/snowflake/cannibalization`;


function Cannibalization() {

  const [stores, setStores] =
    useState([]);

  const [cannibalizationPairs, setCannibalizationPairs] =
  useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedPair, setSelectedPair] =
    useState(null);


  // Fetch stores
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
          store_id: store.store_id,
          store_name:
            store.store_name ??
            "Unnamed Store",
          latitude: store.latitude,
          longitude: store.longitude
        }));

    },
    []
  );


    // Fetch backend cannibalization analysis
  const fetchCannibalizationPairs =
    useCallback(
      async (signal) => {

        const response =
          await fetch(
            CANNIBALIZATION_API_URL,
            { signal }
          );

        if (!response.ok) {
          throw new Error(
            `Cannibalization API request failed: HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          data.status !== "success" ||
          !Array.isArray(data.pairs)
        ) {
          throw new Error(
            "Invalid response received from the Cannibalization API."
          );
        }

        return data.pairs;

      },
      []
    );


  // Load data
  const fetchCannibalizationData =
    useCallback(
      async (signal) => {

        try {

          setLoading(true);
          setError("");

          const [
  storeData,
  cannibalizationPairs
] = await Promise.all([
  fetchStores(signal),
  fetchCannibalizationPairs(signal)
]);

setStores(storeData);
setCannibalizationPairs(cannibalizationPairs);
setSelectedPair(null);

        } catch (err) {

          if (
            err.name === "AbortError"
          ) {
            return;
          }

          console.error(
            "Cannibalization API Error:",
            err
          );

          setError(
            err instanceof TypeError
              ? "Cannot connect to the backend APIs. " +
                "Check that the backend is running and reachable."
              : err.message
          );

          setStores([]);
          setCannibalizationPairs([]);
          setSelectedPair(null);

        } finally {

          if (!signal?.aborted) {
            setLoading(false);
          }

        }

      },
      [
        [
  fetchStores,
  fetchCannibalizationPairs
]
      ]
    );


  // Load when page opens
  useEffect(() => {

    const controller =
      new AbortController();

    fetchCannibalizationData(
      controller.signal
    );

    return () => {
      controller.abort();
    };

  }, [
    fetchCannibalizationData
  ]);


  // Create nearby store pairs
    const storePairs =
    useMemo(() => {

      const storeMap =
        new Map(
          stores.map((store) => [
            String(store.store_id),
            store
          ])
        );

      return cannibalizationPairs.map(
        (pair) => {

          const storeA =
            storeMap.get(
              String(pair.store_a)
            );

          const storeB =
            storeMap.get(
              String(pair.store_b)
            );

          return {
            storeAId: pair.store_a,
            storeAName:
              storeA?.store_name ??
              String(pair.store_a),

            storeBId: pair.store_b,
            storeBName:
              storeB?.store_name ??
              String(pair.store_b),

            distance:
              Number(pair.distance_km) * 1000,
            sharedVisitors:
              Number(pair.shared_visitors) || 0,

            jaccardIndex:
              Number(pair.jaccard_index) || 0,

            overlapPctStoreA:
              Number(pair.overlap_pct_store_a) || 0,

            overlapPctStoreB:
              Number(pair.overlap_pct_store_b) || 0
          };

        }
      );

    }, [
      stores,
      cannibalizationPairs
    ]);


  // Search
  const filteredPairs =
    useMemo(() => {

      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return storePairs;
      }

      return storePairs.filter(
        (pair) => {

          const storeA =
            `${pair.storeAId} ${pair.storeAName}`
              .toLowerCase();

          const storeB =
            `${pair.storeBId} ${pair.storeBName}`
              .toLowerCase();

          return (
            storeA.includes(search) ||
            storeB.includes(search)
          );

        }
      );

    }, [
      storePairs,
      searchTerm
    ]);


  // Stores involved in nearby relationships
  const storesWithNearbyRelations =
    useMemo(() => {

      const ids =
        new Set();

      storePairs.forEach(
        (pair) => {

          ids.add(
            String(pair.storeAId)
          );

          ids.add(
            String(pair.storeBId)
          );

        }
      );

      return ids.size;

    }, [storePairs]);


  // Prepare chart data
  const chartData =
    useMemo(() => {

      return filteredPairs
        .slice(0, 10)
        .map(
          (pair, index) => ({

            pair:
              `Pair ${index + 1}`,

            stores:
              `${pair.storeAName} ↔ ${pair.storeBName}`,

            distance:
              Number(
                (
                  pair.distance / 1000
                ).toFixed(2)
              ),

            sharedVisitors:
  pair.sharedVisitors

          })
        );

    }, [filteredPairs]);


  // Closest pair
  const closestPair =
    storePairs.length > 0
      ? storePairs[0]
      : null;


  return (

    <div className="stores-page">


      {/* Page Introduction */}

      <div className="page-intro">

        <div>

          <h2>
            Cannibalization Analysis
          </h2>

          <p>
            Visualize nearby store relationships
            using geographic proximity and mobility activity.
          </p>

        </div>


        <button
          className="map-button"
          onClick={() => {

            const controller =
              new AbortController();

            fetchCannibalizationData(
              controller.signal
            );

          }}
          disabled={loading}
        >

          {loading
            ? "Loading..."
            : "Refresh Analysis"}

        </button>

      </div>


      {/* Summary Cards */}

      <div className="mobility-stats">

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


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ⇄
          </span>

          <div>

            <p>
              Nearby Store Pairs
            </p>

            <h3>
              {loading || error
                ? "--"
                : storePairs.length}
            </h3>

          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ⌖
          </span>

          <div>

            <p>
              Analysis Radius
            </p>

            <h3>
              1 km
            </h3>

          </div>

        </div>


        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ↑
          </span>

          <div>

            <p>
              Stores in Pairs
            </p>

            <h3>
              {loading || error
                ? "--"
                : storesWithNearbyRelations}
            </h3>

          </div>

        </div>

      </div>


      {/* Visualization */}

      {!loading &&
        !error &&
        chartData.length > 0 && (

          <div className="stores-card">

            <div className="stores-card-header">

              <div>

                <h3>
                  Cannibalization Visualization
                </h3>

                <p>
                  Distance and shared visitor overlap
                  for nearby store relationships.
                </p>

              </div>

            </div>


            <div className="cannibalization-chart">

              <ResponsiveContainer
                width="100%"
                height={350}
              >

                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 10,
                    bottom: 10
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="pair"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(
                      value,
                      name
                    ) => {

                      if (
                        name === "distance"
                      ) {
                        return [
                          `${value} km`,
                          "Distance"
                        ];
                      }

                      return [
  value,
  "Shared Visitors"
];

                    }}
                    labelFormatter={(
                      label
                    ) => {

                      const item =
                        chartData.find(
                          (entry) =>
                            entry.pair ===
                            label
                        );

                      return item
                        ? item.stores
                        : label;

                    }}
                  />

                  <Bar
  dataKey="sharedVisitors"
  name="Shared Visitors"
                    fill="#2563eb"
                    radius={[
                      5,
                      5,
                      0,
                      0
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

        )}


      {/* Analysis Table */}

      <div className="stores-card">

        <div className="stores-card-header">

          <div>

            <h3>
              Nearby Store Relationships
            </h3>

            <p>
              Store pairs within the 1 kilometer
              geographic analysis radius.
            </p>

          </div>


          <input
            type="search"
            placeholder="Search by Store ID or Name..."
            aria-label="Search store pairs"
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
              Loading Visualization...
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
                Cannibalization API Error
              </strong>

              <p>
                {error}
              </p>

              <button
                className="store-view-button"
                onClick={() => {

                  const controller =
                    new AbortController();

                  fetchCannibalizationData(
                    controller.signal
                  );

                }}
              >
                Try Again
              </button>

            </div>

          )}


        {/* No data */}

        {!loading &&
          !error &&
          stores.length === 0 && (

            <div className="store-message">

              <h3>
                No Stores Found
              </h3>

              <p>
                No store records were returned
                by the backend.
              </p>

            </div>

          )}


        {/* No pairs */}

        {!loading &&
          !error &&
          stores.length > 0 &&
          storePairs.length === 0 && (

            <div className="store-message">

              <h3>
                No Nearby Store Pairs
              </h3>

              <p>
                No stores were found within
                the 1 kilometer radius.
              </p>

            </div>

          )}


        {/* No search results */}

        {!loading &&
          !error &&
          storePairs.length > 0 &&
          filteredPairs.length === 0 && (

            <div className="store-message">

              <h3>
                No Matching Store Pairs
              </h3>

              <p>
                No store pairs match
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


        {/* Table */}

        {!loading &&
          !error &&
          filteredPairs.length > 0 && (

            <div className="stores-table-container">

              <table className="stores-table">

                <thead>

                  <tr>

                    <th>
                      Store A
                    </th>

                    <th>
                      Store B
                    </th>

                    <th>
                      Distance
                    </th>

                    <th>
                      Shared Visitors
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredPairs.map(
                    (pair, index) => (

                      <tr
                        key={
                          `${pair.storeAId}-${pair.storeBId}-${index}`
                        }
                      >

                        <td>

                          <strong>
                            {pair.storeAName}
                          </strong>

                          <div className="store-pair-id">
                            ID: {pair.storeAId}
                          </div>

                        </td>


                        <td>

                          <strong>
                            {pair.storeBName}
                          </strong>

                          <div className="store-pair-id">
                            ID: {pair.storeBId}
                          </div>

                        </td>


                        <td>

                          <strong>
                            {formatDistance(
                              pair.distance
                            )}
                          </strong>

                        </td>


                        <td>

                          <strong
                            className={
                              pair.sharedVisitors > 0
                                ? "store-activity-value"
                                : "store-activity-zero"
                            }
                          >
                            {
                             pair.sharedVisitors
                            }
                          </strong>

                        </td>


                        <td>

                          <button
                            className="store-view-button"
                            onClick={() =>
                              setSelectedPair(
                                pair
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


      {/* Selected Pair */}

      {selectedPair && (

        <div className="store-details-panel">

          <div className="store-details-header">

            <div>

              <h3>
                Selected Store Pair
              </h3>

              <p>
                Geographic and visitor overlap analysis
              </p>

            </div>


            <button
              className="store-details-close"
              onClick={() =>
                setSelectedPair(null)
              }
              aria-label="Close pair details"
            >
              ×
            </button>

          </div>


          <div className="store-details-grid">

            <div>

              <span>
                Store A
              </span>

              <strong>
                {selectedPair.storeAName}
              </strong>

            </div>


            <div>

              <span>
                Store B
              </span>

              <strong>
                {selectedPair.storeBName}
              </strong>

            </div>


            <div>

              <span>
                Distance
              </span>

              <strong>
                {formatDistance(
                  selectedPair.distance
                )}
              </strong>

            </div>


            <div>

              <span>
                Shared Visitors
              </span>

              <strong>
                {selectedPair.sharedVisitors}
              </strong>

            </div>

          </div>


          <p className="store-details-note">

            The visualization represents geographic
            proximity and shared visitor overlap between
            store pairs. It does not establish confirmed
            customer switching, revenue loss, or actual
            sales cannibalization.

          </p>

        </div>

      )}

    </div>

  );
}

export default Cannibalization;
