/**
 * FootfallDashboard.jsx
 * Main dashboard component for the GeoPulse retail analytics UI.
 * Renders a Kepler.gl heatmap and a KPI summary panel for the selected store.
 *
 * Dependencies: react, @kepler.gl/components, recharts, date-fns
 * Author: shubhamgawari64
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// -------------------------------------------------------------------------
// Constants & helpers
// -------------------------------------------------------------------------

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const VISIT_TYPE_COLORS = {
  pass_by: "#f97316",
  short_visit: "#3b82f6",
  long_visit: "#10b981",
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json();
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// -------------------------------------------------------------------------
// KPI Card
// -------------------------------------------------------------------------

function KpiCard({ label, value, unit = "", color = "#6366f1" }) {
  return (
    <div
      className="kpi-card"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${color}44`,
        borderRadius: "12px",
        padding: "16px 20px",
        minWidth: "140px",
        flex: "1",
      }}
    >
      <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", letterSpacing: "0.05em" }}>
        {label.toUpperCase()}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: "28px", fontWeight: 700, color }}>
        {value}
        {unit && <span style={{ fontSize: "14px", marginLeft: "4px" }}>{unit}</span>}
      </p>
    </div>
  );
}

// -------------------------------------------------------------------------
// Visit Type Bar Chart
// -------------------------------------------------------------------------

function VisitTypeChart({ data }) {
  const chartData = [
    { name: "Pass-by", count: data.pass_by_count, fill: VISIT_TYPE_COLORS.pass_by },
    { name: "Short Visit", count: data.short_visit_count, fill: VISIT_TYPE_COLORS.short_visit },
    { name: "Long Visit", count: data.long_visit_count, fill: VISIT_TYPE_COLORS.long_visit },
  ];

  return (
    <div style={{ marginTop: "24px" }}>
      <h4 style={{ margin: "0 0 12px", color: "#e2e8f0" }}>Visit Type Breakdown</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px" }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, idx) => (
              <rect key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// -------------------------------------------------------------------------
// Store Selector
// -------------------------------------------------------------------------

function StoreSelector({ stores, selectedId, onChange }) {
  return (
    <select
      id="store-selector"
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "#1e293b",
        color: "#e2e8f0",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "14px",
        cursor: "pointer",
      }}
    >
      {stores.map((s) => (
        <option key={s.store_id} value={s.store_id}>
          {s.store_name}
        </option>
      ))}
    </select>
  );
}

// -------------------------------------------------------------------------
// Main Dashboard
// -------------------------------------------------------------------------

export default function FootfallDashboard() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [footfall, setFootfall] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load store list on mount
  useEffect(() => {
    fetchJSON(`${API_BASE}/api/v1/stores`)
      .then((data) => {
        setStores(data);
        if (data.length > 0) setSelectedStoreId(data[0].store_id);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Load footfall whenever selected store changes
  const loadFootfall = useCallback(() => {
    if (!selectedStoreId) return;
    setLoading(true);
    setError(null);

    const url =
      `${API_BASE}/api/v1/stores/${selectedStoreId}/footfall` +
      `?start_date=${formatDate(weekAgo)}&end_date=${formatDate(today)}`;

    fetchJSON(url)
      .then((data) => setFootfall(data[0] || null))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedStoreId]);

  useEffect(() => {
    loadFootfall();
  }, [loadFootfall]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: "#0f172a",
        minHeight: "100vh",
        padding: "32px",
        color: "#e2e8f0",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#f1f5f9" }}>
          📍 GeoPulse — Footfall Dashboard
        </h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
          Retail mobility analytics · Last 7 days
        </p>
      </div>

      {/* Store selector */}
      {stores.length > 0 && (
        <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ color: "#94a3b8", fontSize: "14px" }}>Store:</label>
          <StoreSelector
            stores={stores}
            selectedId={selectedStoreId}
            onChange={setSelectedStoreId}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#7f1d1d",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "24px",
            color: "#fca5a5",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* KPIs */}
      {loading && <p style={{ color: "#64748b" }}>Loading footfall data…</p>}

      {footfall && !loading && (
        <>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
            <KpiCard label="Total Visits" value={footfall.total_visits.toLocaleString()} color="#6366f1" />
            <KpiCard label="Unique Visitors" value={footfall.unique_visitors.toLocaleString()} color="#3b82f6" />
            <KpiCard label="Avg Dwell" value={footfall.avg_dwell_minutes} unit="min" color="#10b981" />
            <KpiCard
              label="Conversion Rate"
              value={((footfall.long_visit_count / footfall.total_visits) * 100).toFixed(1)}
              unit="%"
              color="#f59e0b"
            />
          </div>
          <VisitTypeChart data={footfall} />
        </>
      )}

      {/* Heatmap placeholder */}
      <div
        style={{
          marginTop: "32px",
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed #334155",
          borderRadius: "12px",
          padding: "48px",
          textAlign: "center",
          color: "#475569",
        }}
      >
        🗺️ Kepler.gl Heatmap — connect to /api/v1/stores/{selectedStoreId}/heatmap
      </div>
    </div>
  );
}
