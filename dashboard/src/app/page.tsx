"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Location = {
  id: string;
  store_number: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  order_type: string;
  status: string;
  total: number;
  created_at: string;
  estimated_ready_time: string | null;
  items: OrderItem[];
};

type OrderItem = {
  name: string;
  size: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations: Record<string, unknown>;
  special_requests: string | null;
};

type Call = {
  id: string;
  retell_call_id: string;
  caller_phone: string;
  caller_name: string | null;
  status: string;
  duration_seconds: number | null;
  started_at: string;
  order_accuracy_verified: boolean | null;
  order_id: string | null;
};

type StockAlert = {
  item_type: string;
  item_id: string;
  item_name: string;
  stock_status: string;
  quantity: number | null;
  notes: string | null;
  expected_restock_at: string | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-800",
};

const stockColors: Record<string, string> = {
  low_stock: "bg-yellow-100 text-yellow-800",
  out_of_stock: "bg-red-100 text-red-800",
  discontinued: "bg-gray-200 text-gray-600",
};

export default function Dashboard() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [stats, setStats] = useState({
    orders_completed_24h: 0,
    revenue_24h: 0,
    avg_order_value: 0,
    active_orders: 0,
    active_calls: 0,
  });
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load locations
  useEffect(() => {
    fetch(`${API_URL}/api/locations?is_active=true`)
      .then((r) => r.json())
      .then((data) => {
        const locs = Array.isArray(data) ? data : data.locations || [];
        setLocations(locs);
        if (locs.length > 0) setSelectedLocation(locs[0].id);
      })
      .catch(console.error);
  }, []);

  // Load dashboard data
  const loadDashboard = () => {
    if (!selectedLocation) return;
    setLoading(true);
    fetch(`${API_URL}/api/dashboard/${selectedLocation}`)
      .then((r) => r.json())
      .then((data) => {
        setActiveOrders(data.active_orders || []);
        setRecentOrders(data.recent_orders || []);
        setActiveCalls(data.active_calls || []);
        setRecentCalls(data.recent_calls || []);
        setStockAlerts(data.stock_alerts || []);
        setStats({
          orders_completed_24h: data.stats?.orders_completed_24h || 0,
          revenue_24h: data.stats?.revenue_24h || 0,
          avg_order_value: data.stats?.avg_order_value || 0,
          active_orders: data.active_orders?.length || 0,
          active_calls: data.active_calls?.length || 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedLocation]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedLocation]);

  // Load call transcript
  const loadTranscript = (callId: string) => {
    setSelectedCall(callId);
    fetch(`${API_URL}/api/calls/${callId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.segments && data.segments.length) {
          setTranscript(
            data.segments
              .map(
                (s: { speaker: string; text: string }) =>
                  `[${s.speaker === "agent" ? "🤖 Agent" : "👤 Customer"}] ${s.text}`
              )
              .join("\n\n")
          );
        } else {
          setTranscript(data.transcript_text || "No transcript available.");
        }
      })
      .catch(() => setTranscript("Error loading transcript."));
  };

  const selectedLoc = locations.find((l) => l.id === selectedLocation);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍕</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SliceLine</h1>
              <p className="text-red-100 text-sm">Store Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-red-700 text-white border border-red-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.store_number} — {loc.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-red-100">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={loadDashboard}
              className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded-lg text-sm font-medium"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Store Info Bar */}
      {selectedLoc && (
        <div className="bg-white border-b px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
            <span>
              📍 {selectedLoc.street}, {selectedLoc.city}, {selectedLoc.state} {selectedLoc.zip}
            </span>
            <span>📞 {selectedLoc.phone}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            label="Active Orders"
            value={stats.active_orders}
            icon="📦"
            color="bg-blue-50 border-blue-200"
          />
          <StatCard
            label="Active Calls"
            value={stats.active_calls}
            icon="📞"
            color="bg-green-50 border-green-200"
          />
          <StatCard
            label="Orders (24h)"
            value={stats.orders_completed_24h}
            icon="✅"
            color="bg-purple-50 border-purple-200"
          />
          <StatCard
            label="Revenue (24h)"
            value={`$${stats.revenue_24h.toFixed(2)}`}
            icon="💰"
            color="bg-yellow-50 border-yellow-200"
          />
          <StatCard
            label="Avg Order"
            value={`$${stats.avg_order_value.toFixed(2)}`}
            icon="📊"
            color="bg-pink-50 border-pink-200"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                📦 Active Orders
                {activeOrders.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeOrders.length}
                  </span>
                )}
              </h2>
            </div>
            {activeOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">🍕</p>
                <p>No active orders</p>
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {activeOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold">{order.order_number}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          statusColors[order.status] || "bg-gray-100"
                        }`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        {order.customer_name} · {order.order_type}
                      </span>
                      <span className="font-semibold">${order.total.toFixed(2)}</span>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {order.items.map((item, i) => (
                          <span key={i}>
                            {item.quantity}× {item.name}
                            {item.size ? ` (${item.size})` : ""}
                            {i < order.items.length - 1 ? " · " : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-lg">
                ⚠️ Stock Alerts
                {stockAlerts.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {stockAlerts.length}
                  </span>
                )}
              </h2>
            </div>
            {stockAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">✅</p>
                <p>All items in stock</p>
              </div>
            ) : (
              <div className="divide-y max-h-64 overflow-y-auto">
                {stockAlerts.map((alert, i) => (
                  <div key={i} className="p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{alert.item_name}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          stockColors[alert.stock_status] || "bg-gray-100"
                        }`}
                      >
                        {alert.stock_status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                    {alert.notes && (
                      <p className="text-xs text-gray-500 mt-1">{alert.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Recent Calls + Transcript */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Recent Calls */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-lg">
                📞 Recent Calls
                {recentCalls.length > 0 && (
                  <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {recentCalls.length}
                  </span>
                )}
              </h2>
            </div>
            {recentCalls.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">📞</p>
                <p>No recent calls</p>
              </div>
            ) : (
              <div className="divide-y max-h-72 overflow-y-auto">
                {recentCalls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => loadTranscript(call.id)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                      selectedCall === call.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono">{call.caller_phone || "Unknown"}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          call.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {call.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : "—"}</span>
                      <span>
                        {call.order_accuracy_verified === true && "✅ Verified"}
                        {call.order_accuracy_verified === false && "❌ Issue"}
                        {call.order_accuracy_verified === null && "⏳ Unverified"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Call Transcript */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-lg">📝 Call Transcript</h2>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto">
              {selectedCall ? (
                <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700 leading-relaxed">
                  {transcript || "Loading..."}
                </pre>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-4xl mb-2">📝</p>
                  <p>Select a call to view transcript</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Completed Orders */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-lg">📋 Recent Orders (24h)</h2>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No completed orders in the last 24 hours</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Order #</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Items</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono">{order.order_number}</td>
                      <td className="px-4 py-2">{order.customer_name}</td>
                      <td className="px-4 py-2 capitalize">{order.order_type}</td>
                      <td className="px-4 py-2">
                        {order.items?.length || 0} item(s)
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            statusColors[order.status] || "bg-gray-100"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className={`${color} border rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </div>
  );
}