"use client";
// @ts-nocheck
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// SVG Icons
const IconStore = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconClock = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconPackage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconPhone = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27 1.27a2 2 0 012.11.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>;
const IconDollar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
const IconTrendingUp = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconArrowLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;

function formatCurrency(val: number | string): string { return "$" + Number(val || 0).toFixed(2); }

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  out_for_delivery: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-slate-100 text-slate-600 border-slate-200",
};

const TABS = [
  { key: "orders", label: "Orders" },
  { key: "stock", label: "Stock" },
  { key: "menu", label: "Menu" },
  { key: "toppings", label: "Toppings" },
  { key: "specials", label: "Specials" },
  { key: "locations", label: "Locations" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("orders");
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [stats, setStats] = useState({
    orders_completed_24h: 0, orders_cancelled_24h: 0, revenue_24h: 0,
    avg_order_value: 0, active_orders: 0, active_calls: 0, avg_call_duration: 0,
  });
  const [activeOrders, setActiveOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/locations?is_active=true`)
      .then(r => { if (!r.ok) throw new Error(`Locations: ${r.status}`); return r.json(); })
      .then(data => {
        const locs = Array.isArray(data) ? data : data.locations || [];
        setLocations(locs);
        if (locs.length > 0 && !selectedLocation) setSelectedLocation(locs[0].id);
      })
      .catch(e => { console.error(e); setError("Could not load locations. Check your connection."); });
  }, []);

  useEffect(() => { if (selectedLocation) loadDashboard(); }, [selectedLocation]);

  const loadDashboard = () => {
    if (!selectedLocation) return;
    fetch(`${API_URL}/api/dashboard/${selectedLocation}`)
      .then(r => { if (!r.ok) throw new Error(`Dashboard: ${r.status}`); return r.json(); })
      .then(data => {
        setStats(data.stats || {});
        setActiveOrders(data.active_orders || []);
        setRecentOrders(data.recent_orders || []);
        setRecentCalls(data.recent_calls || []);
        setStockAlerts(data.stock_alerts || []);
      })
      .catch(e => { console.error(e); });
  };

  useEffect(() => {
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, [selectedLocation]);

  const selectedLoc = locations.find(l => l.id === selectedLocation);
  const locName = selectedLoc ? `${selectedLoc.store_number} — ${selectedLoc.name} (${selectedLoc.city})` : "Select location";

  const updateOrderStatus = async (orderId: string, status: string) => {
    await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadDashboard();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-sm text-center">
          <p className="text-sm font-medium text-slate-700 mb-1">Connection Error</p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button onClick={() => { setError(null); loadDashboard(); }} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SliceLine</h1>
            <p className="text-xs text-slate-400">Franchise Management</p>
          </div>
          <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}
            className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 max-w-[280px]">
            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.store_number} — {loc.name} ({loc.city})</option>)}
          </select>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <nav className="flex gap-1 overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                    activeTab === tab.key ? "border-red-500 text-white" : "border-transparent text-slate-400 hover:text-white"
                  }`}>{tab.label}</button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "orders" && (
          <OrdersTab stats={stats} activeOrders={activeOrders} recentOrders={recentOrders}
            recentCalls={recentCalls} stockAlerts={stockAlerts} updateOrderStatus={updateOrderStatus} />
        )}
        {activeTab === "stock" && selectedLocation && (
          <StockTab locationId={selectedLocation} locationName={locName} />
        )}
        {activeTab === "menu" && <MenuTab franchiseId={locations[0]?.franchise_id} />}
        {activeTab === "toppings" && <ToppingsTab franchiseId={locations[0]?.franchise_id} />}
        {activeTab === "specials" && <SpecialsTab franchiseId={locations[0]?.franchise_id} />}
        {activeTab === "locations" && selectedLocation && <LocationsTab locationId={selectedLocation} />}
      </main>
    </div>
  );
}

// @ts-nocheck
// === ORDERS TAB ===
function OrdersTab({ stats, activeOrders, recentOrders, recentCalls, stockAlerts, updateOrderStatus }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Active", value: stats.active_orders, icon: <IconPackage />, color: "blue" },
          { label: "Completed", value: stats.orders_completed_24h, icon: <IconTrendingUp />, color: "emerald" },
          { label: "Revenue", value: formatCurrency(stats.revenue_24h), icon: <IconDollar />, color: "green" },
          { label: "Avg Order", value: formatCurrency(stats.avg_order_value), icon: <IconDollar />, color: "slate" },
          { label: "Calls", value: stats.active_calls, icon: <IconPhone />, color: "purple" },
          { label: "Avg Call", value: stats.avg_call_duration ? `${Math.floor(Number(stats.avg_call_duration) / 60)}m` : "—", icon: <IconClock />, color: "rose" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <span className={`text-${s.color}-500`}>{s.icon}</span>
            </div>
            <p className="text-xl font-semibold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {stockAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Stock Alerts</h3>
          <div className="space-y-1">
            {stockAlerts.map(a => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-amber-700">{a.item_name}</span>
                <span className="text-amber-600 capitalize">{a.stock_status?.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Active Orders</h2>
          <div className="space-y-2">
            {activeOrders.length ? activeOrders.map(o => (
              <div key={o.id} className={`bg-white rounded-lg border-l-4 p-3 ${STATUS_COLORS[o.status] || "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-800 text-sm">{o.order_number}</span>
                  <span className="text-xs font-medium capitalize">{o.status?.replace(/_/g, " ")}</span>
                </div>
                <div className="text-xs text-slate-500">{o.customer_name} — {o.order_type} — {formatCurrency(o.total)}</div>
                {(o.status === "confirmed" || o.status === "preparing") && (
                  <div className="flex gap-2 mt-2">
                    {o.status === "confirmed" && <button onClick={() => updateOrderStatus(o.id, "preparing")} className="text-xs bg-orange-500 text-white px-2 py-1 rounded">Preparing</button>}
                    {o.status === "preparing" && <button onClick={() => updateOrderStatus(o.id, o.order_type === "delivery" ? "out_for_delivery" : "ready")} className="text-xs bg-emerald-500 text-white px-2 py-1 rounded">{o.order_type === "delivery" ? "Out for Delivery" : "Ready"}</button>}
                  </div>
                )}
                {o.items && o.items.map(item => (
                  <div key={item.id} className="text-xs text-slate-400 mt-0.5">{item.quantity}x {item.name} {item.size ? `(${item.size})` : ""}</div>
                ))}
              </div>
            )) : <p className="text-sm text-slate-400">No active orders</p>}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Recent Calls</h2>
          <div className="space-y-2">
            {recentCalls.length ? recentCalls.map(c => (
              <div key={c.id} className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{c.caller_phone || "Unknown"}</span>
                  <span className="text-slate-400">{c.duration_seconds ? `${Math.floor(Number(c.duration_seconds) / 60)}m ${Number(c.duration_seconds) % 60}s` : "In progress"}</span>
                </div>
              </div>
            )) : <p className="text-sm text-slate-400">No recent calls</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// === STOCK TAB ===
function StockTab({ locationId, locationName }) {
  const [stock, setStock] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [franchiseId, setFranchiseId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/locations?is_active=true`).then(r => r.json()).then(d => {
      const locs = Array.isArray(d) ? d : d.locations || [];
      if (locs[0]) setFranchiseId(locs[0].franchise_id);
    });
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/locations/${locationId}/stock`).then(r => r.json()).then(d => { setStock(d); setLoading(false); });
  }, [locationId]);

  useEffect(() => {
    if (!franchiseId) return;
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/toppings`).then(r => r.json()).then(d => setToppings(d.toppings || []));
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/items`).then(r => r.json()).then(d => setMenuItems(d.items || []));
  }, [franchiseId]);

  const toggleStock = async (itemType, itemId) => {
    const list = itemType === "topping" ? (stock?.toppings || []) : (stock?.menu_items || []);
    const existing = list.find(s => s.item_id === itemId);
    if (existing) {
      await fetch(`${API_URL}/api/admin/locations/${locationId}/stock/${existing.id}`, { method: "DELETE" });
    } else {
      await fetch(`${API_URL}/api/admin/locations/${locationId}/stock`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ item_type: itemType, item_id: itemId, stock_status: "out_of_stock" }] }),
      });
    }
    const d = await fetch(`${API_URL}/api/admin/locations/${locationId}/stock`).then(r => r.json());
    setStock(d);
  };

  if (loading) return <p className="text-sm text-slate-400">Loading stock data...</p>;

  const oosToppings = new Set((stock?.toppings || []).filter(s => s.stock_status === "out_of_stock").map(s => s.item_id));
  const oosItems = new Set((stock?.menu_items || []).filter(s => s.stock_status === "out_of_stock").map(s => s.item_id));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-1">Stock for {locationName}</h3>
        <p className="text-sm text-slate-500 mb-4">Click items to toggle in/out of stock. Topping outages cascade to affected pizzas.</p>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Toppings</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          {toppings.map(t => (
            <button key={t.id} onClick={() => toggleStock("topping", t.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                oosToppings.has(t.id) ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}>
              {t.name} {oosToppings.has(t.id) && <span className="text-xs">(OUT)</span>}
            </button>
          ))}
        </div>
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Menu Items</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {menuItems.filter(i => i.category_name === "Pizzas").map(item => {
            const unavailable = !item.is_available || item.unavailable_reason;
            return (
              <button key={item.id} onClick={() => toggleStock("menu_item", item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  unavailable ? "bg-red-50 text-red-700 border border-red-200" : oosItems.has(item.id) ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}>
                {item.name}
                {unavailable && <span className="block text-xs text-red-500">{item.unavailable_reason || "Unavailable"}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === MENU TAB ===
function MenuTab({ franchiseId }) {
  const [menuItems, setMenuItems] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!franchiseId) return;
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/items`).then(r => r.json()).then(d => setMenuItems(d.items || []));
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/toppings`).then(r => r.json()).then(d => setToppings(d.toppings || []));
  }, [franchiseId]);

  const saveItem = async (item) => {
    setSaving(true);
    try {
      const url = item.id ? `${API_URL}/api/admin/items/${item.id}` : `${API_URL}/api/admin/items`;
      const method = item.id ? "PUT" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      fetch(`${API_URL}/api/admin/franchises/${franchiseId}/items`).then(r => r.json()).then(d => setMenuItems(d.items || []));
      setEditingItem(null);
    } catch {}
    setSaving(false);
  };

  const pizzaItems = menuItems.filter(i => i.category_name === "Pizzas");
  const otherItems = menuItems.filter(i => i.category_name !== "Pizzas");

  return (
    <div className="space-y-6">
      {pizzaItems.map(item => <MenuItemCard key={item.id} item={item} toppings={toppings} onEdit={() => setEditingItem({...item})} />)}
      <h2 className="text-lg font-semibold text-slate-800 pt-2">Other Items</h2>
      <div className="grid gap-3">{otherItems.map(item => <MenuItemCard key={item.id} item={item} toppings={toppings} onEdit={() => setEditingItem({...item})} />)}</div>
      {editingItem && <ItemEditModal item={editingItem} toppings={toppings} onSave={saveItem} onClose={() => setEditingItem(null)} saving={saving} />}
    </div>
  );
}

function MenuItemCard({ item, toppings, onEdit }) {
  const reqToppings = (item.default_toppings || []).filter(t => t.is_required).map(t => t.name);
  const optToppings = (item.default_toppings || []).filter(t => !t.is_required).map(t => t.name);
  const unavailable = item.unavailable_reason || (!item.is_available ? "Unavailable" : "");
  return (
    <div className={`bg-white rounded-xl border p-4 ${unavailable ? "border-red-200 bg-red-50/30" : "border-slate-200"}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{item.name}</span>
            {unavailable && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{unavailable}</span>}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">{item.description}</div>
          {reqToppings.length > 0 && (
            <div className="mt-1.5 text-xs text-slate-500">
              <span className="font-medium">Required:</span> {reqToppings.join(", ")}
              {optToppings.length > 0 && <><span className="mx-1">|</span><span className="font-medium">Optional:</span> {optToppings.join(", ")}</>}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-semibold text-slate-700">{formatCurrency(item.base_price)}</div>
          <div className="text-xs text-slate-400">{item.category_name}</div>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={onEdit} className="text-xs text-slate-500 hover:text-red-500 font-medium">Edit</button>
      </div>
    </div>
  );
}

function ItemEditModal({ item, toppings, onSave, onClose, saving }) {
  const [form, setForm] = useState(item);
  const allToppings = toppings.filter(t => t.is_available !== false);

  const toggleTopping = (toppingId, isRequired) => {
    const current = form.default_toppings || [];
    const existing = current.findIndex(t => t.topping_id === toppingId);
    if (existing >= 0) {
      const updated = [...current]; updated[existing] = {...updated[existing], is_required: isRequired}; setForm({...form, default_toppings: updated});
    } else {
      const topping = allToppings.find(t => t.id === toppingId);
      setForm({...form, default_toppings: [...current, { topping_id: toppingId, name: topping?.name, is_required: isRequired, price: topping?.base_price, is_premium: topping?.is_premium, display_order: current.length }]});
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{item.id ? "Edit" : "New"} Menu Item</h3>
          <button onClick={onClose}><IconX /></button>
        </div>
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-slate-700">Name</label><input type="text" value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium text-slate-700">Description</label><textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm h-16 resize-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-slate-700">Base Price ($)</label><input type="number" step="0.01" value={form.base_price || ""} onChange={e => setForm({...form, base_price: Number(e.target.value)})} className="w-full border border-slate-200 rounded px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-slate-700 flex items-center gap-2"><input type="checkbox" checked={form.is_available !== false} onChange={e => setForm({...form, is_available: e.target.checked})} className="rounded" />Available</label></div>
          </div>
          {form.category_id && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Default Toppings</label>
              <div className="space-y-1.5">
                {(form.default_toppings || []).map(t => (
                  <div key={t.topping_id} className="flex items-center gap-2 text-sm bg-slate-50 rounded px-3 py-1.5">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={t.is_required} onChange={() => toggleTopping(t.topping_id, !t.is_required)} className="rounded" /><span className="text-xs text-slate-500">Required</span></label>
                    <span className="flex-1 font-medium text-slate-700">{t.name}</span>
                    {t.is_premium && <span className="text-xs text-amber-600 font-medium">Premium</span>}
                    <span className="text-xs text-slate-400">{formatCurrency(t.price)}</span>
                    <button onClick={() => setForm({...form, default_toppings: (form.default_toppings || []).filter(ft => ft.topping_id !== t.topping_id)})} className="text-slate-400 hover:text-red-500"><IconX /></button>
                  </div>
                ))}
                <select onChange={e => { if (e.target.value) toggleTopping(e.target.value, true); e.target.value = ""; }} className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-500">
                  <option value="">+ Add topping...</option>
                  {allToppings.filter(t => !(form.default_toppings || []).some(ft => ft.topping_id === t.id)).map(t => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.base_price)}){t.is_premium ? " - Premium" : ""}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={() => onSave(form)} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white disabled:bg-slate-300">{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// === TOPPINGS TAB ===
function ToppingsTab({ franchiseId }) {
  const [toppings, setToppings] = useState([]);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("1.50");
  const [newPremium, setNewPremium] = useState(false);

  useEffect(() => {
    if (!franchiseId) return;
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/toppings`).then(r => r.json()).then(d => setToppings(d.toppings || []));
  }, [franchiseId]);

  const addTopping = async () => {
    if (!newName.trim()) return;
    await fetch(`${API_URL}/api/admin/toppings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ franchise_id: franchiseId, name: newName, base_price: Number(newPrice), is_premium: newPremium }),
    });
    setNewName(""); setNewPrice("1.50"); setNewPremium(false);
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/toppings`).then(r => r.json()).then(d => setToppings(d.toppings || []));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Add Topping</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1"><label className="text-xs font-medium text-slate-500">Name</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="e.g. Truffle Oil" /></div>
          <div className="w-24"><label className="text-xs font-medium text-slate-500">Price ($)</label><input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full border border-slate-200 rounded px-3 py-2 text-sm" /></div>
          <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={newPremium} onChange={e => setNewPremium(e.target.checked)} className="rounded" /><span className="text-sm text-slate-600">Premium</span></label>
          <button onClick={addTopping} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Add</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-medium text-slate-500">Topping</th><th className="px-4 py-3 text-right font-medium text-slate-500">Price</th><th className="px-4 py-3 text-center font-medium text-slate-500">Premium</th><th className="px-4 py-3 text-center font-medium text-slate-500">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {toppings.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5 font-medium text-slate-700">{t.name}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(t.base_price)}</td>
                <td className="px-4 py-2.5 text-center">{t.is_premium ? <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Premium</span> : <span className="text-xs text-slate-400">Standard</span>}</td>
                <td className="px-4 py-2.5 text-center">{t.is_available !== false ? <span className="text-xs font-medium text-emerald-600">Active</span> : <span className="text-xs font-medium text-red-600">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// === SPECIALS TAB ===
function SpecialsTab({ franchiseId }) {
  const [specials, setSpecials] = useState([]);
  useEffect(() => {
    if (!franchiseId) return;
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/specials`).then(r => r.json()).then(d => setSpecials(d.specials || []));
  }, [franchiseId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Specials & Promotions</h3>
      <div className="space-y-3">
        {specials.map(s => (
          <div key={s.id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div><span className="font-semibold text-slate-800">{s.name}</span><span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.is_active ? "Active" : "Inactive"}</span></div>
              <span className="text-sm font-medium text-slate-600">{s.discount_type === "percentage" ? `${s.discount_value}% off` : s.discount_type === "fixed" ? `${formatCurrency(s.discount_value)} off` : s.discount_type}</span>
            </div>
            {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
          </div>
        ))}
        {specials.length === 0 && <p className="text-sm text-slate-400">No specials configured.</p>}
      </div>
    </div>
  );
}

// === LOCATIONS TAB ===
function LocationsTab({ locationId }) {
  const [location, setLocation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState([]);
  const [greeting, setGreeting] = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryMinOrder, setDeliveryMinOrder] = useState(0);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/locations/${locationId}`).then(r => r.json()).then(d => {
      setLocation(d);
      setHours(d.hours || []);
      setGreeting(d.phone_greeting || "");
      setDeliveryEnabled(d.delivery_enabled ?? true);
      setDeliveryFee(Number(d.delivery_fee || 0));
      setDeliveryMinOrder(Number(d.delivery_min_order || 0));
      setZones(d.delivery_zones || []);
    });
  }, [locationId]);

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const save = async () => {
    setSaving(true);
    await fetch(`${API_URL}/api/admin/locations/${locationId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours, phone_greeting: greeting, delivery_enabled: deliveryEnabled, delivery_fee: deliveryFee, delivery_min_order: deliveryMinOrder, delivery_zones: zones }),
    });
    setSaving(false);
  };

  if (!location) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Hours of Operation</h3>
        <div className="space-y-2">
          {DAYS.map((day, i) => {
            const h = hours.find(h => h.day === i) || { day: i, open: "11:00", close: "22:00", is_closed: false };
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-medium text-slate-600">{day}</span>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!h.is_closed} onChange={e => {
                    const nh = [...hours]; const idx = nh.findIndex(x => x.day === i);
                    if (idx >= 0) nh[idx] = {...nh[idx], is_closed: !e.target.checked}; else nh.push({day: i, open: "11:00", close: "22:00", is_closed: !e.target.checked});
                    setHours(nh);
                  }} className="rounded" /><span className="text-slate-500">Open</span>
                </label>
                {!h.is_closed && (<>
                  <input type="time" value={h.open || "11:00"} onChange={e => { const nh = [...hours]; const idx = nh.findIndex(x => x.day === i); if (idx >= 0) nh[idx] = {...nh[idx], open: e.target.value}; setHours(nh); }} className="border border-slate-200 rounded px-2 py-1 text-sm" />
                  <span className="text-slate-400">to</span>
                  <input type="time" value={h.close || "22:00"} onChange={e => { const nh = [...hours]; const idx = nh.findIndex(x => x.day === i); if (idx >= 0) nh[idx] = {...nh[idx], close: e.target.value}; setHours(nh); }} className="border border-slate-200 rounded px-2 py-1 text-sm" />
                </>)}
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Phone Greeting</h3>
        <textarea value={greeting} onChange={e => setGreeting(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Delivery Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3"><input type="checkbox" checked={deliveryEnabled} onChange={e => setDeliveryEnabled(e.target.checked)} className="rounded" /><span className="text-sm font-medium text-slate-700">Delivery Enabled</span></label>
          {deliveryEnabled && (<>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-slate-500">Delivery Fee ($)</label><input type="number" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} className="w-full border border-slate-200 rounded px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-medium text-slate-500">Min Order for Delivery ($)</label><input type="number" step="0.01" value={deliveryMinOrder} onChange={e => setDeliveryMinOrder(Number(e.target.value))} className="w-full border border-slate-200 rounded px-3 py-2 text-sm" /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">Delivery Zones</label>
              {zones.map((z, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input type="number" value={z.radius_km} onChange={e => { const nz = [...zones]; nz[i] = {...nz[i], radius_km: Number(e.target.value)}; setZones(nz); }} className="w-20 border border-slate-200 rounded px-2 py-1 text-sm" placeholder="km" />
                  <span className="text-sm text-slate-500">km — $</span>
                  <input type="number" step="0.01" value={z.fee} onChange={e => { const nz = [...zones]; nz[i] = {...nz[i], fee: Number(e.target.value)}; setZones(nz); }} className="w-20 border border-slate-200 rounded px-2 py-1 text-sm" placeholder="fee" />
                  <button onClick={() => setZones(zones.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><IconX /></button>
                </div>
              ))}
              <button onClick={() => setZones([...zones, { radius_km: 10, fee: 7.00 }])} className="text-sm text-red-500 hover:text-red-600 font-medium">+ Add Zone</button>
            </div>
          </>)}
        </div>
      </div>
      <button onClick={save} disabled={saving} className="bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg text-sm font-medium">{saving ? "Saving..." : "Save Location Config"}</button>
    </div>
  );
}