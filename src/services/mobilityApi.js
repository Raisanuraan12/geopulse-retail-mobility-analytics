const API_BASE_URL = "http://127.0.0.1:8000";

export async function getMobilityDashboard() {
  const response = await fetch(`${API_BASE_URL}/mobility/dashboard`);

  if (!response.ok) {
    throw new Error("Failed to fetch mobility dashboard data");
  }

  return response.json();
}