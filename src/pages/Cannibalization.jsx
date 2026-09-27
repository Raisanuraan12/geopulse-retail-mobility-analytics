import API_BASE_URL from "../services/api";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORE_API_URL =
  `${API_BASE_URL}/snowflake/stores?limit=1000`;

const MOBILITY_API_URL =
  `${API_BASE_URL}/mobility/points?limit=1000`;

// Stores within this distance are considered nearby.
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


function Cannibalization() {

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


  // Fetch mobility points
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
              Number(point.latitude);

            const longitude =
              Number(point.longitude);

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


  // Load both datasets
  const fetchCannibalizationData =
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

          setStores(storeData);
          setMobilityPoints(mobilityData);
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
          setMobilityPoints([]);
          setSelectedPair(null);

        } finally {

          if (!signal?.aborted) {
            setLoading(false);
          }

        }

      },
      [
        fetchStores,
        fetchMobilityPoints
      ]
    );


  // Load data when page opens
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

      const pairs = [];

      for (
        let i = 0;
        i < stores.length;
        i++
      ) {

        const storeA =
          stores[i];

        const latitudeA =
          Number(storeA.latitude);

        const longitudeA =
          Number(storeA.longitude);

        if (
          !Number.isFinite(latitudeA) ||
          !Number.isFinite(longitudeA)
        ) {
          continue;
        }


        for (
          let j = i + 1;
          j < stores.length;
          j++
        ) {

          const storeB =
            stores[j];

          const latitudeB =
            Number(storeB.latitude);

          const longitudeB =
            Number(storeB.longitude);

          if (
            !Number.isFinite(latitudeB) ||
            !Number.isFinite(longitudeB)
          ) {
            continue;
          }


          const distance =
            calculateDistanceMeters(
              latitudeA,
              longitudeA,
              latitudeB,
              longitudeB
            );


          if (
            distance === null ||
            distance >
              CANNIBALIZATION_RADIUS_METERS
          ) {
            continue;
          }


          // Count mobility points near either store.
          let nearbyMobility = 0;

          mobilityPoints.forEach(
            (point) => {

              const pointLatitude =
                Number(point.latitude);

              const pointLongitude =
                Number(point.longitude);


              const distanceFromA =
                calculateDistanceMeters(
                  latitudeA,
                  longitudeA,
                  pointLatitude,
                  pointLongitude
                );


              const distanceFromB =
                calculateDistanceMeters(
                  latitudeB,
                  longitudeB,
                  pointLatitude,
                  pointLongitude
                );


              if (
                (distanceFromA !== null &&
                  distanceFromA <=
                    CANNIBALIZATION_RADIUS_METERS) ||
                (distanceFromB !== null &&
                  distanceFromB <=
                    CANNIBALIZATION_RADIUS_METERS)
              ) {
                nearbyMobility += 1;
              }

            }
          );


          pairs.push({
            storeAId:
              storeA.store_id,

            storeAName:
              storeA.store_name,

            storeBId:
              storeB.store_id,

            storeBName:
              storeB.store_name,

            distance,

            nearbyMobility
          });

        }

      }

      return pairs.sort(
        (a, b) =>
          a.distance - b.distance
      );

    }, [
      stores,
      mobilityPoints
    ]);


  // Search store pairs
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


  // Stores participating in nearby pairs
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


  // Closest store pair
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
            Analyze nearby retail stores using
            geographic proximity and mobility activity.
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
              Stores in Nearby Pairs
            </p>

            <h3>
              {loading || error
                ? "--"
                : storesWithNearbyRelations}
            </h3>

          </div>

        </div>

      </div>


      {/* Analysis Card */}

      <div className="stores-card">

        <div className="stores-card-header">

          <div>

            <h3>
              Nearby Store Analysis
            </h3>

            <p>
              Stores located within 1 kilometer
              of another store.
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
              Loading Analysis...
            </h3>

            <p>
              Fetching store locations and
              mobility data from the backend.
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


        {/* No stores */}

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


        {/* No nearby pairs */}

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
                the 1 kilometer analysis radius.
              </p>

            </div>

          )}


        {/* No search result */}

        {!loading &&
          !error &&
          storePairs.length > 0 &&
          filteredPairs.length === 0 && (

            <div className="store-message">

              <h3>
                No Matching Store Pairs
              </h3>

              <p>
                No nearby store pairs match
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


        {/* Store Pair Table */}

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
                      Nearby Mobility
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
                        key={`${pair.storeAId}-${pair.storeBId}-${index}`}
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
                              pair.nearbyMobility > 0
                                ? "store-activity-value"
                                : "store-activity-zero"
                            }
                          >
                            {pair.nearbyMobility}
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


      {/* Closest Pair */}

      {!loading &&
        !error &&
        closestPair && (

          <div className="store-details-panel">

            <div className="store-details-header">

              <div>

                <h3>
                  Closest Nearby Store Pair
                </h3>

                <p>
                  Geographic proximity analysis
                </p>

              </div>

            </div>


            <div className="store-details-grid">

              <div>

                <span>
                  Store A
                </span>

                <strong>
                  {closestPair.storeAName}
                </strong>

              </div>


              <div>

                <span>
                  Store B
                </span>

                <strong>
                  {closestPair.storeBName}
                </strong>

              </div>


              <div>

                <span>
                  Distance
                </span>

                <strong>
                  {formatDistance(
                    closestPair.distance
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Nearby Mobility
                </span>

                <strong>
                  {closestPair.nearbyMobility}
                </strong>

              </div>

            </div>


            <p className="store-details-note">

              This analysis identifies geographic
              proximity between stores and nearby
              mobility activity. It does not represent
              confirmed customer switching, revenue
              loss, or sales cannibalization.

            </p>

          </div>

        )}


      {/* Selected Pair Details */}

      {selectedPair && (

        <div className="store-details-panel">

          <div className="store-details-header">

            <div>

              <h3>
                Store Pair Details
              </h3>

              <p>
                Selected cannibalization analysis pair
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
                Store A ID
              </span>

              <strong>
                {selectedPair.storeAId}
              </strong>

            </div>


            <div>

              <span>
                Store B ID
              </span>

              <strong>
                {selectedPair.storeBId}
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
                Nearby Mobility
              </span>

              <strong>
                {selectedPair.nearbyMobility}
              </strong>

            </div>

          </div>


          <p className="store-details-note">

            The 1 km radius is used only for
            geographic proximity analysis. Nearby
            mobility points indicate GPS activity
            around the store pair and should not be
            interpreted as confirmed customer
            overlap.

          </p>

        </div>

      )}

    </div>

  );
}

export default Cannibalization;