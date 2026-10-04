import API_BASE_URL from "../services/api";
import { useEffect, useMemo, useState } from "react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";


const API_URL =
  `${API_BASE_URL}/mobility/points?limit=1000`;


function Analytics() {

  const [points, setPoints] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // Fetch real mobility data
  const fetchMobilityData = async () => {

    try {

      setLoading(true);

      setError("");


      const response =
        await fetch(API_URL);


      if (!response.ok) {

        throw new Error(
          `API request failed with status ${response.status}`
        );

      }


      const data =
        await response.json();


      if (!Array.isArray(data.points)) {

        throw new Error(
          "Invalid API response: points array not found."
        );

      }


      setPoints(data.points);

    } catch (err) {

      console.error(
        "Footfall Visualization API Error:",
        err
      );

      setError(
        "Unable to load mobility activity data."
      );

      setPoints([]);

    } finally {

      setLoading(false);

    }

  };


  // Load data when page opens
  useEffect(() => {

    fetchMobilityData();

  }, []);


  /*
   * Group GPS points by hour.
   *
   * Example:
   *
   * 09:00 → 125 pings
   * 10:00 → 184 pings
   * 11:00 → 210 pings
   */

  const hourlyData = useMemo(() => {

    const hourlyCounts = {};


    points.forEach((point) => {

      if (!point.timestamp) {
        return;
      }


      const date =
        new Date(point.timestamp);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return;
      }


      const hour =
        date.getHours();


      const label =
        `${String(hour).padStart(2, "0")}:00`;


      hourlyCounts[label] =
        (hourlyCounts[label] || 0) + 1;

    });


    return Object.entries(
      hourlyCounts
    )
      .map(
        ([hour, pings]) => ({
          hour,
          pings
        })
      )
      .sort(
        (a, b) =>
          a.hour.localeCompare(b.hour)
      );

  }, [points]);


  // Peak activity hour
  const peakActivity = useMemo(() => {

    if (
      hourlyData.length === 0
    ) {
      return null;
    }


    return hourlyData.reduce(
      (highest, current) =>
        current.pings >
        highest.pings
          ? current
          : highest
    );

  }, [hourlyData]);


  // Average activity
  const averageActivity = useMemo(() => {

    if (
      hourlyData.length === 0
    ) {
      return 0;
    }


    const total =
      hourlyData.reduce(
        (sum, item) =>
          sum + item.pings,
        0
      );


    return Math.round(
      total / hourlyData.length
    );

  }, [hourlyData]);


  return (

    <div className="analytics-page">


      {/* Page Introduction */}

      <div className="page-intro">

        <div>

          <h2>
            Footfall Analytics
          </h2>

          <p>
            Analyze mobility activity and GPS
            traffic patterns across different hours.
          </p>

        </div>


        <button
          className="map-button"
          onClick={fetchMobilityData}
          disabled={loading}
        >

          {loading
            ? "Loading..."
            : "Refresh Analytics"}

        </button>

      </div>


      {/* Analytics Summary */}

      <div className="mobility-stats">


        {/* Total GPS Pings */}

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ⌖
          </span>

          <div>

            <p>
              Total GPS Pings
            </p>

            <h3>

              {loading
                ? "--"
                : points.length}

            </h3>

          </div>

        </div>


        {/* Peak Activity */}

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ↑
          </span>

          <div>

            <p>
              Peak Activity
            </p>

            <h3>

              {loading
                ? "--"
                : peakActivity
                ? peakActivity.hour
                : "--"}

            </h3>

          </div>

        </div>


        {/* Peak GPS Pings */}

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ◉
          </span>

          <div>

            <p>
              Peak GPS Pings
            </p>

            <h3>

              {loading
                ? "--"
                : peakActivity
                ? peakActivity.pings
                : "--"}

            </h3>

          </div>

        </div>


        {/* Average */}

        <div className="mobility-stat-card">

          <span className="mobility-stat-icon">
            ▤
          </span>

          <div>

            <p>
              Avg. Pings / Hour
            </p>

            <h3>

              {loading
                ? "--"
                : averageActivity}

            </h3>

          </div>

        </div>

      </div>


      {/* API Error */}

      {!loading &&
        error && (

          <div
            className="analytics-message error"
          >

            <strong>
              Analytics API Error
            </strong>

            <p>
              {error}
            </p>

            <button
              className="store-view-button"
              onClick={fetchMobilityData}
            >
              Try Again
            </button>

          </div>

        )}


      {/* Loading */}

      {loading && (

        <div
          className="analytics-message"
        >

          <h3>
            Loading Mobility Activity...
          </h3>

          <p>
            Fetching GPS activity from
            the backend.
          </p>

        </div>

      )}


      {/* Empty */}

      {!loading &&
        !error &&
        points.length === 0 && (

          <div
            className="analytics-message"
          >

            <h3>
              No Mobility Data Available
            </h3>

            <p>
              No GPS mobility points were
              returned by the backend.
            </p>

          </div>

        )}


      {/* Chart */}

      {!loading &&
        !error &&
        hourlyData.length > 0 && (

          <div
            className="analytics-chart-card"
          >


            <div
              className="analytics-chart-header"
            >

              <div>

                <h3>
                  Mobility Activity by Hour
                </h3>

                <p>
                  GPS ping activity grouped
                  by hour
                </p>

              </div>


              <span className="analytics-live">
                Live API Data
              </span>

            </div>


            <div
              className="analytics-chart"
            >

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <AreaChart
                  data={hourlyData}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="hour"
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip
                    formatter={(value) => [
                      value,
                      "GPS Pings"
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="pings"
                    stroke="#2563eb"
                    fill="#dbeafe"
                    strokeWidth={2}
                  />

                </AreaChart>

              </ResponsiveContainer>

            </div>

          </div>

        )}


      {/* Information */}

      <div
        className="analytics-info-card"
      >

        <h3>
          About This Visualization
        </h3>

        <p>
          This visualization currently
          uses real mobility GPS points
          from the GeoPulse backend and
          groups them by timestamp.
          GPS ping activity is not treated
          as an exact visitor count.
        </p>

      </div>


    </div>

  );

}


export default Analytics;