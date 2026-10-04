import API_BASE_URL from "../services/api";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from "react-leaflet";
import L from "leaflet";
import { useNavigate, useParams } from "react-router-dom";

const STORE_API_URL =
  `${API_BASE_URL}/snowflake/stores?limit=1000`;

const MOBILITY_API_URL =
  `${API_BASE_URL}/mobility/points?limit=1000`;

const ACTIVITY_RADIUS_METERS = 500;


// Fix Leaflet marker icons
const defaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


// Calculate distance between GPS coordinates
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

  const deltaLatitude =
    toRadians(lat2 - lat1);

  const deltaLongitude =
    toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLongitude / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


// Component to move map to selected store
function MapCenter({ latitude, longitude }) {

  const map = useMap();

  useEffect(() => {

    if (
      Number.isFinite(
        Number(latitude)
      ) &&
      Number.isFinite(
        Number(longitude)
      )
    ) {

      map.setView(
        [
          Number(latitude),
          Number(longitude)
        ],
        15
      );

    }

  }, [
    map,
    latitude,
    longitude
  ]);

  return null;
}


function StoresDetails() {

  const { storeId } =
    useParams();

  const navigate =
    useNavigate();


  const [store, setStore] =
    useState(null);

  const [mobilityPoints, setMobilityPoints] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // Fetch store and mobility data
  const fetchStoreDetails =
    useCallback(
      async (signal) => {

        try {

          setLoading(true);
          setError("");


          const [
            storeResponse,
            mobilityResponse
          ] = await Promise.all([
            fetch(
              STORE_API_URL,
              { signal }
            ),
            fetch(
              MOBILITY_API_URL,
              { signal }
            )
          ]);


          if (
            !storeResponse.ok
          ) {

            if (
              storeResponse.status === 503
            ) {

              throw new Error(
                "The Store API is temporarily unavailable. " +
                "The backend or Snowflake connection may not be ready."
              );

            }

            throw new Error(
              `Store API request failed: HTTP ${storeResponse.status}`
            );

          }


          if (
            !mobilityResponse.ok
          ) {

            throw new Error(
              `Mobility API request failed: HTTP ${mobilityResponse.status}`
            );

          }


          const storeData =
            await storeResponse.json();

          const mobilityData =
            await mobilityResponse.json();


          if (
            storeData.status !== "success" ||
            !Array.isArray(
              storeData.stores
            )
          ) {

            throw new Error(
              "Invalid response received from the Store API."
            );

          }


          if (
            !Array.isArray(
              mobilityData.points
            )
          ) {

            throw new Error(
              "Invalid response received from the Mobility API."
            );

          }


          const foundStore =
            storeData.stores.find(
              (item) =>
                String(
                  item.store_id
                ) === String(storeId)
            );


          if (!foundStore) {

            throw new Error(
              "Store not found."
            );

          }


          setStore({
            store_id:
              foundStore.store_id,

            store_name:
              foundStore.store_name ??
              "Unnamed Store",

            latitude:
              foundStore.latitude,

            longitude:
              foundStore.longitude
          });


          const validMobilityPoints =
            mobilityData.points.filter(
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
            );


          setMobilityPoints(
            validMobilityPoints
          );

        } catch (err) {

          if (
            err.name === "AbortError"
          ) {
            return;
          }

          console.error(
            "Store Details Error:",
            err
          );

          setError(
            err instanceof TypeError
              ? "Cannot connect to the backend APIs. " +
                "Check that the backend is running and reachable."
              : err.message
          );

          setStore(null);
          setMobilityPoints([]);

        } finally {

          if (
            !signal?.aborted
          ) {

            setLoading(false);

          }

        }

      },
      [storeId]
    );


  // Load details
  useEffect(() => {

    const controller =
      new AbortController();

    fetchStoreDetails(
      controller.signal
    );

    return () => {
      controller.abort();
    };

  }, [
    fetchStoreDetails
  ]);


  // Valid store coordinates
  const storeCoordinates =
    useMemo(() => {

      if (!store) {
        return null;
      }

      const latitude =
        Number(store.latitude);

      const longitude =
        Number(store.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {

        return null;

      }

      return {
        latitude,
        longitude
      };

    }, [store]);


  // Mobility points within 500 meters
  const nearbyPoints =
    useMemo(() => {

      if (!storeCoordinates) {
        return [];
      }

      return mobilityPoints.filter(
        (point) => {

          const distance =
            calculateDistanceMeters(
              storeCoordinates.latitude,
              storeCoordinates.longitude,
              point.latitude,
              point.longitude
            );

          return (
            distance !== null &&
            distance <=
              ACTIVITY_RADIUS_METERS
          );

        }
      );

    }, [
      storeCoordinates,
      mobilityPoints
    ]);


  const formatCoordinate =
    (value) => {

      const number =
        Number(value);

      return Number.isFinite(number)
        ? number.toFixed(6)
        : "N/A";

    };


  return (

    <div className="store-details-page">


      {/* Page Header */}

      <div className="page-intro">

        <div>

          <h2>
            Store Details
          </h2>

          <p>
            Detailed location and mobility
            information for the selected store.
          </p>

        </div>


        <button
          className="map-button"
          onClick={() =>
            navigate("/stores")
          }
        >
          ← Back to Stores
        </button>

      </div>


      {/* Loading */}

      {loading && (

        <div className="store-message">

          <h3>
            Loading Store Details...
          </h3>

          <p>
            Fetching store and mobility
            information from the backend.
          </p>

        </div>

      )}


      {/* Error */}

      {!loading &&
        error && (

          <div className="store-error">

            <strong>
              Store Details Error
            </strong>

            <p>
              {error}
            </p>


            <button
              className="store-view-button"
              onClick={() => {

                const controller =
                  new AbortController();

                fetchStoreDetails(
                  controller.signal
                );

              }}
            >
              Try Again
            </button>


            <button
              className="store-view-button store-back-button"
              onClick={() =>
                navigate("/stores")
              }
            >
              Back to Stores
            </button>

          </div>

        )}


      {/* Store Details */}

      {!loading &&
        !error &&
        store && (

          <>


            {/* Store Information */}

            <div className="store-details-panel">

              <div className="store-details-header">

                <div>

                  <h3>
                    {store.store_name}
                  </h3>

                  <p>
                    Store Information
                  </p>

                </div>

              </div>


              <div className="store-details-grid">


                <div>

                  <span>
                    Store ID
                  </span>

                  <strong>
                    {store.store_id}
                  </strong>

                </div>


                <div>

                  <span>
                    Store Name
                  </span>

                  <strong>
                    {store.store_name}
                  </strong>

                </div>


                <div>

                  <span>
                    Latitude
                  </span>

                  <strong>
                    {formatCoordinate(
                      store.latitude
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Longitude
                  </span>

                  <strong>
                    {formatCoordinate(
                      store.longitude
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Analysis Radius
                  </span>

                  <strong>
                    500 meters
                  </strong>

                </div>


                <div>

                  <span>
                    Nearby GPS Activity
                  </span>

                  <strong>
                    {nearbyPoints.length}
                  </strong>

                </div>

              </div>


              <p className="store-details-note">

                Nearby GPS Activity represents GPS
                mobility points located within 500
                meters of this store. It is a derived
                mobility metric and is not an exact
                visitor count.

              </p>

            </div>


            {/* Store Map */}

            <div className="store-details-panel">

              <div className="store-details-header">

                <div>

                  <h3>
                    Store Location
                  </h3>

                  <p>
                    Geographic location and nearby
                    mobility activity.
                  </p>

                </div>

              </div>


              {storeCoordinates ? (

                <div className="store-details-map">

                  <MapContainer
                    center={[
                      storeCoordinates.latitude,
                      storeCoordinates.longitude
                    ]}
                    zoom={15}
                    scrollWheelZoom={true}
                    className="store-detail-leaflet-map"
                  >

                    <MapCenter
                      latitude={
                        storeCoordinates.latitude
                      }
                      longitude={
                        storeCoordinates.longitude
                      }
                    />


                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />


                    {/* Store radius */}

                    <Circle
                      center={[
                        storeCoordinates.latitude,
                        storeCoordinates.longitude
                      ]}
                      radius={
                        ACTIVITY_RADIUS_METERS
                      }
                      pathOptions={{
                        color: "#2563eb",
                        fillColor: "#2563eb",
                        fillOpacity: 0.08
                      }}
                    />


                    {/* Store marker */}

                    <Marker
                      position={[
                        storeCoordinates.latitude,
                        storeCoordinates.longitude
                      ]}
                      icon={defaultIcon}
                    >

                      <Popup>

                        <strong>
                          {store.store_name}
                        </strong>

                        <br />

                        Store ID:{" "}
                        {store.store_id}

                        <br />

                        Nearby GPS Activity:{" "}
                        {nearbyPoints.length}

                      </Popup>

                    </Marker>


                    {/* Nearby mobility points */}

                    {nearbyPoints.map(
                      (point, index) => (

                        <Circle
                          key={
                            `${point.device_id}-${point.timestamp}-${index}`
                          }
                          center={[
                            Number(
                              point.latitude
                            ),
                            Number(
                              point.longitude
                            )
                          ]}
                          radius={5}
                          pathOptions={{
                            color: "#64748b",
                            fillColor: "#64748b",
                            fillOpacity: 0.7
                          }}
                        />

                      )
                    )}

                  </MapContainer>

                </div>

              ) : (

                <div className="store-message">

                  <h3>
                    Location Unavailable
                  </h3>

                  <p>
                    Valid latitude and longitude
                    coordinates are not available
                    for this store.
                  </p>

                </div>

              )}

            </div>


            {/* Mobility Summary */}

            <div className="mobility-stats">


              <div className="mobility-stat-card">

                <span className="mobility-stat-icon">
                  ▤
                </span>

                <div>

                  <p>
                    Store ID
                  </p>

                  <h3>
                    {store.store_id}
                  </h3>

                </div>

              </div>


              <div className="mobility-stat-card">

                <span className="mobility-stat-icon">
                  ⌖
                </span>

                <div>

                  <p>
                    Nearby GPS Points
                  </p>

                  <h3>
                    {nearbyPoints.length}
                  </h3>

                </div>

              </div>


              <div className="mobility-stat-card">

                <span className="mobility-stat-icon">
                  ◉
                </span>

                <div>

                  <p>
                    Radius
                  </p>

                  <h3>
                    500 m
                  </h3>

                </div>

              </div>


              <div className="mobility-stat-card">

                <span className="mobility-stat-icon">
                  ↗
                </span>

                <div>

                  <p>
                    Map Status
                  </p>

                  <h3>
                    {storeCoordinates
                      ? "Ready"
                      : "N/A"}
                  </h3>

                </div>

              </div>

            </div>


          </>

        )}

    </div>

  );
}


export default StoresDetails;