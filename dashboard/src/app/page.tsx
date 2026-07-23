"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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

type OrderItem = {
  name: string;
  size: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations: Record<string, unknown>;
  special_requests: string | null;
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
  notes?: string | null;
  delivery_address?: string | null;
};

type Call = {
  id: string;
  retell_call_id: string;
  caller_phone: string;
  caller_name: string | null;
  status: string;
  duration_seconds: number | null;
  started_at: string;
  order_id: string | null;
  order_accuracy_verified: boolean | null;
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

type CallSegment = {
  speaker: string;
  text: string;
  timestamp_ms: number;
  intent: string | null;
};

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", border: "border-amber-200" },
  confirmed: { label: "Confirmed", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400", border: "border-blue-200" },
  preparing: { label: "Preparing", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400", border: "border-orange-200" },
  ready: { label: "Ready", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400", border: "border-emerald-200" },
  completed: { label: "Completed", bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", border: "border-gray-200" },
  cancelled: { label: "Cancelled", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400", border: "border-red-200" },
};

const stockConfig: Record<string, { label: string; bg: string; text: string }> = {
  low_stock: { label: "Low Stock", bg: "bg-amber-50", text: "text-amber-700" },
  out_of_stock: { label: "Out of Stock", bg: "bg-red-50", text: "text-red-700" },
  discontinued: { label: "Discontinued", bg: "bg-gray-100", text: "text-gray-500" },
};

// SVG Icons
function IconPackage() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function IconPhone() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>; }
function IconCheck() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function IconDollar() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
function IconChart() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconAlert() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconClock() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconRefresh() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>; }
function IconChevronDown() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>; }
function IconChevronRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
function IconClockStat() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M2 12h2M20 12h2M12 2v2M12 20v2"/></svg>; }
function IconTranscript() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
function IconDelivery() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>; }

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatCurrency(val: number): string {
  return "$" + val.toFixed(2);
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function Dashboard() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [stats, setStats] = useState({
    orders_completed_24h: 0, orders_cancelled_24h: 0,
    revenue_24h: 0, avg_order_value: 0,
    active_orders: 0, active_calls: 0, avg_call_duration: 0,
  });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [transcriptSegments, setTranscriptSegments] = useState<CallSegment[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/locations?is_active=true`)
      .then((r) => r.json())
      .then((data) => {
        const locs = Array.isArray(data) ? data : data.locations || [];
        setLocations(locs);
        if (locs.length > 0 && !selectedLocation) setSelectedLocation(locs[0].id);
      })
      .catch(console.error);
  }, []);

  const loadDashboard = () => {
    if (!selectedLocation) return;
    fetch(`${API_URL}/api/dashboard/${selectedLocation}`)
      .then((r) => r.json())
      .then((data) => {
        setActiveOrders(data.active_orders || []);
        setRecentOrders(data.recent_orders || []);
        setRecentCalls(data.recent_calls || []);
        setStockAlerts(data.stock_alerts || []);
        setStats({
          orders_completed_24h: data.stats?.orders_completed_24h || 0,
          orders_cancelled_24h: data.stats?.orders_cancelled_24h || 0,
          revenue_24h: data.stats?.revenue_24h || 0,
          avg_order_value: data.stats?.avg_order_value || 0,
          active_orders: data.active_orders?.length || 0,
          active_calls: data.active_calls?.length || 0,
          avg_call_duration: data.stats?.avg_call_duration || 0,
        });
      })
      .catch(console.error);
  };

  useEffect(() => { loadDashboard(); }, [selectedLocation]);
  useEffect(() => {
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, [selectedLocation]);

  const loadTranscript = (callId: string) => {
    if (selectedCall === callId) {
      setSelectedCall(null);
      setTranscriptSegments([]);
      return;
    }
    setSelectedCall(callId);
    setTranscriptLoading(true);
    fetch(`${API_URL}/api/calls/${callId}`)
      .then((r) => r.json())
      .then((data) => {
        setTranscriptSegments(data.segments || []);
      })
      .catch(() => setTranscriptSegments([]))
      .finally(() => setTranscriptLoading(false));
  };

  const selectedLoc = locations.find((l) => l.id === selectedLocation);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15.5 15.5L19 19M8 11a3 3 0 105 0 3 3 0 00-5 0z"/><path d="M21 11a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold tracking-tight">SliceLine</h1>
              <p className="text-xs text-slate-400">Store Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent max-w-[280px]"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.store_number} — {loc.name} ({loc.city})
                </option>
              ))}
            </select>
            <button
              onClick={loadDashboard}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <IconRefresh />
            </button>
          </div>
        </div>
        {selectedLoc && (
          <div className="border-t border-slate-800 px-4 sm:px-6 py-1.5 text-xs text-slate-400 hidden sm:block">
            {selectedLoc.street}, {selectedLoc.city}, {selectedLoc.state} {selectedLoc.zip} · {selectedLoc.phone}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<IconPackage />} label="Active Orders" value={stats.active_orders} color="blue" />
          <StatCard icon={<IconCheck />} label="Completed" value={stats.orders_completed_24h} color="emerald" />
          <StatCard icon={<IconDollar />} label="Revenue" value={formatCurrency(stats.revenue_24h)} color="amber" />
          <StatCard icon={<IconChart />} label="Avg Order" value={formatCurrency(stats.avg_order_value)} color="violet" />
          <StatCard icon={<IconPhone />} label="Calls" value={recentCalls.length} color="cyan" />
          <StatCard icon={<IconClockStat />} label="Avg Call" value={stats.avg_call_duration ? `${Math.floor(stats.avg_call_duration / 60)}m` : "—"} color="rose" />
        </div>

        {/* Active Orders + Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Active Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <IconPackage />
                Active Orders
                {activeOrders.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{activeOrders.length}</span>
                )}
              </div>
            </div>
            {activeOrders.length === 0 ? (
              <EmptyState icon={<IconPackage />} message="No active orders" />
            ) : (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {activeOrders.map((order) => {
                  const sc = statusConfig[order.status] || statusConfig.pending;
                  const isExpanded = expandedOrder === order.id;
                  return (
                    <div key={order.id} className={`${sc.border} border-l-[3px]`}>
                      <button
                        className="w-full text-left px-4 sm:px-5 py-3 hover:bg-slate-50/50 transition-colors"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-800">{order.order_number}</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                            {order.order_type === "delivery" && <IconDelivery />}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-700">{formatCurrency(order.total)}</span>
                            <span className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}><IconChevronRight /></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{order.customer_name}</span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1"><IconClock /> {timeAgo(order.created_at)}</span>
                        </div>
                      </button>
                      {isExpanded && order.items && (
                        <div className="px-4 sm:px-5 pb-3 pt-0">
                          <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs space-y-1.5">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between">
                                <span className="text-slate-700">
                                  {item.quantity}× {item.name}{item.size ? ` (${item.size})` : ""}
                                </span>
                                <span className="text-slate-500 font-medium">{formatCurrency(item.total_price)}</span>
                              </div>
                            ))}
                            {order.notes && (
                              <div className="text-slate-400 italic pt-1 border-t border-slate-200 mt-1.5">
                                Note: {order.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <IconAlert />
                Stock Alerts
                {stockAlerts.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{stockAlerts.length}</span>
                )}
              </div>
            </div>
            {stockAlerts.length === 0 ? (
              <EmptyState icon={<IconCheck />} message="All items in stock" />
            ) : (
              <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto">
                {stockAlerts.map((alert, i) => {
                  const sc = stockConfig[alert.stock_status] || stockConfig.out_of_stock;
                  return (
                    <div key={i} className="px-4 sm:px-5 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{alert.item_name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </div>
                      {alert.notes && <p className="text-xs text-slate-400 mt-1">{alert.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Calls — merged list with inline transcript */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <IconPhone />
              Recent Calls
              {recentCalls.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{recentCalls.length}</span>
              )}
            </div>
          </div>
          {recentCalls.length === 0 ? (
            <EmptyState icon={<IconPhone />} message="No recent calls" />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentCalls.map((call) => {
                const isSelected = selectedCall === call.id;
                return (
                  <div key={call.id}>
                    <button
                      className={`w-full text-left px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}
                      onClick={() => loadTranscript(call.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            call.status === "in_progress" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {call.status === "in_progress" ? "LIVE" : call.caller_name?.[0] || "?"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-700">{call.caller_name || call.caller_phone}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>{call.caller_phone}</span>
                              {call.duration_seconds && <span className="flex items-center gap-1"><IconClock />{formatDuration(call.duration_seconds)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {call.order_accuracy_verified === true && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Verified</span>
                          )}
                          {call.order_accuracy_verified === false && (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Issue</span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            call.status === "completed" ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {call.status === "in_progress" ? "Live" : call.status}
                          </span>
                          <span className={`text-slate-400 transition-transform ${isSelected ? "rotate-90" : ""}`}><IconChevronRight /></span>
                        </div>
                      </div>
                    </button>
                    {isSelected && (
                      <div className="px-4 sm:px-5 pb-4">
                        {transcriptLoading ? (
                          <div className="py-8 text-center text-sm text-slate-400">Loading transcript...</div>
                        ) : transcriptSegments.length > 0 ? (
                          <div className="space-y-2.5 max-h-72 overflow-y-auto">
                            {transcriptSegments.map((seg, i) => (
                              <div key={i} className={`flex gap-2 ${seg.speaker === "agent" ? "" : "flex-row-reverse"}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  seg.speaker === "agent" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                                }`}>
                                  {seg.speaker === "agent" ? "AI" : "C"}
                                </div>
                                <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed max-w-[85%] ${
                                  seg.speaker === "agent" ? "bg-blue-50 text-slate-700" : "bg-slate-100 text-slate-700"
                                }`}>
                                  {seg.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm text-slate-400">No transcript available</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <IconCheck />
              Recent Orders (24h)
              {stats.orders_cancelled_24h > 0 && (
                <span className="bg-red-50 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {stats.orders_cancelled_24h} cancelled
                </span>
              )}
            </div>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState icon={<IconCheck />} message="No completed orders in the last 24 hours" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 sm:px-5 py-3 text-left font-medium">Order</th>
                    <th className="px-4 sm:px-5 py-3 text-left font-medium hidden sm:table-cell">Customer</th>
                    <th className="px-4 sm:px-5 py-3 text-left font-medium">Type</th>
                    <th className="px-4 sm:px-5 py-3 text-right font-medium">Total</th>
                    <th className="px-4 sm:px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-4 sm:px-5 py-3 text-left font-medium hidden sm:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((order) => {
                    const sc = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 sm:px-5 py-3 font-mono text-xs font-semibold text-slate-700">{order.order_number}</td>
                        <td className="px-4 sm:px-5 py-3 text-slate-600 hidden sm:table-cell">{order.customer_name}</td>
                        <td className="px-4 sm:px-5 py-3 capitalize text-slate-600 text-xs sm:text-sm">{order.order_type}</td>
                        <td className="px-4 sm:px-5 py-3 text-right font-semibold text-slate-700">{formatCurrency(order.total)}</td>
                        <td className="px-4 sm:px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-slate-400 text-xs hidden sm:table-cell flex items-center gap-1">
                          {timeAgo(order.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-xs text-slate-400 text-center">
          SliceLine — Demo Pizza Operations Dashboard
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-500" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-500" },
    violet: { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-500" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-500" },
    cyan: { bg: "bg-cyan-50", border: "border-cyan-100", icon: "text-cyan-500" },
    rose: { bg: "bg-rose-50", border: "border-rose-100", icon: "text-rose-500" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-3 sm:p-4`}>
      <div className="flex items-center justify-between">
        <span className={`${c.icon}`}>{icon}</span>
        <span className="text-lg sm:text-2xl font-bold text-slate-800">{value}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="p-8 sm:p-12 text-center">
      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">{icon}</div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}