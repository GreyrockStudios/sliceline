// @ts-nocheck
"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const STATUS_CONFIG = {
  confirmed: { label: "New", color: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800" },
  preparing: { label: "Making", color: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800" },
  ready: { label: "Ready", color: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-purple-500", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800" },
};

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function minutesAgo(ts) {
  if (!ts) return 0;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/locations?is_active=true`)
      .then(r => r.json())
      .then(data => {
        const locs = Array.isArray(data) ? data : data.locations || [];
        setLocations(locs);
        if (locs.length && !locationId) setLocationId(locs[0].id);
      });
  }, []);

  useEffect(() => {
    if (!locationId) return;
    const load = () => {
      fetch(`${API_URL}/api/orders/kitchen/${locationId}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => setOrders(data.orders || []))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [locationId]);

  const advanceOrder = async (orderId, currentStatus) => {
    const next = { confirmed: "preparing", preparing: "ready", ready: "completed", out_for_delivery: "delivered" };
    const nextStatus = next[currentStatus];
    if (!nextStatus) return;
    await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setOrders(orders.filter(o => o.id !== orderId).concat(nextStatus === "completed" || nextStatus === "delivered" ? [] : [{ ...orders.find(o => o.id === orderId), status: nextStatus }]).filter(Boolean));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Kitchen Display</h1>
          <span className="text-sm text-slate-400">{orders.length} active</span>
        </div>
        <select value={locationId} onChange={e => setLocationId(e.target.value)}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-1.5 text-sm">
          {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.store_number} — {loc.name}</option>)}
        </select>
      </header>

      <div className="p-4 sm:p-6">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl font-bold text-slate-500">No active orders</p>
            <p className="text-slate-600 mt-2">Waiting for new orders...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map(order => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed;
              const mins = minutesAgo(order.created_at);
              const urgent = mins > 15;
              return (
                <div key={order.id} className={`rounded-xl border-2 ${config.border} ${config.bg} p-4 relative overflow-hidden`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`text-2xl font-bold ${config.text}`}>{order.order_number}</span>
                      <div className="text-sm text-slate-500">{order.order_type === "delivery" ? "Delivery" : "Pickup"}</div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${config.color} text-white`}>{config.label}</span>
                      <div className={`text-sm mt-1 ${urgent ? "text-red-600 font-bold" : "text-slate-500"}`}>{mins}m ago</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-700 mb-2">{order.customer_name}</div>
                  <div className="space-y-1.5 mb-3">
                    {order.items.map(item => (
                      <div key={item.id} className="text-sm">
                        <span className="font-semibold text-slate-800">{item.quantity}x {item.name}</span>
                        {item.size && <span className="text-slate-500 ml-1">({item.size})</span>}
                        {item.customizations && Object.keys(item.customizations).length > 0 && (
                          <div className="text-xs text-slate-500 ml-4">
                            {item.customizations.added_toppings && item.customizations.added_toppings.map(t => <span key={t.topping_id || t.name} className="text-emerald-600">+{t.name} </span>)}
                            {item.customizations.removed_toppings && item.customizations.removed_toppings.map(t => <span key={t} className="text-red-500">-{t} </span>)}
                            {item.customizations.extra_cheese && <span className="text-emerald-600">+Extra Cheese</span>}
                          </div>
                        )}
                        {item.special_requests && <div className="text-xs text-red-500 italic ml-4">{item.special_requests}</div>}
                      </div>
                    ))}
                  </div>
                  {order.notes && <div className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-1 mb-3">{order.notes}</div>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">${Number(order.total).toFixed(2)}</span>
                    <button onClick={() => advanceOrder(order.id, order.status)}
                      className={`${config.color} text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity`}>
                      {order.status === "confirmed" ? "Start Making" : order.status === "preparing" ? "Mark Ready" : order.status === "ready" ? (order.order_type === "delivery" ? "Out for Delivery" : "Complete") : "Complete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}