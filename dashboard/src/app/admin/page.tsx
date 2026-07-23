"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// SVG Icons
function IconChevronDown() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>; }
function IconPlus() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconX() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IconArrowLeft() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>; }

type Tab = "locations" | "menu" | "toppings" | "specials" | "stock";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("menu");
  const [franchiseId, setFranchiseId] = useState("");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [toppings, setToppings] = useState<any[]>([]);
  const [locationDetail, setLocationDetail] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/locations?is_active=true`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const locs = Array.isArray(data) ? data : data.locations || [];
        setLocations(locs);
        if (locs.length && !selectedLocation) setSelectedLocation(locs[0].id);
      })
      .catch(() => setError("Could not load locations"));
  }, []);

  useEffect(() => {
    if (!locations.length) return;
    setFranchiseId(locations[0].franchise_id);
  }, [locations]);

  const loadMenuItems = () => {
    if (!franchiseId) return;
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/items`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setMenuItems(data.items || []))
      .catch(() => {});
  };

  const loadToppings = () => {
    if (!franchiseId) return;
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/toppings`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setToppings(data.toppings || []))
      .catch(() => {});
  };

  const loadLocationDetail = () => {
    if (!selectedLocation) return;
    fetch(`${API_URL}/api/admin/locations/${selectedLocation}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setLocationDetail(data))
      .catch(() => {});
  };

  useEffect(() => { loadMenuItems(); }, [franchiseId, activeTab === "menu"]);
  useEffect(() => { loadToppings(); }, [franchiseId, activeTab === "toppings"]);
  useEffect(() => { loadLocationDetail(); }, [selectedLocation, activeTab === "locations"]);

  const selectedLoc = locations.find(l => l.id === selectedLocation);

  const saveLocationConfig = async (updates: any) => {
    if (!selectedLocation) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/admin/locations/${selectedLocation}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!r.ok) throw new Error("Save failed");
      const data = await r.json();
      setLocationDetail(data);
    } catch { setError("Failed to save"); }
    setSaving(false);
  };

  const saveItem = async (item: any) => {
    setSaving(true);
    try {
      const url = item.id ? `${API_URL}/api/admin/items/${item.id}` : `${API_URL}/api/admin/items`;
      const method = item.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      if (!r.ok) throw new Error("Save failed");
      loadMenuItems();
      setEditingItem(null);
    } catch { setError("Failed to save item"); }
    setSaving(false);
  };

  const pizzaItems = menuItems.filter(i => i.category_name === "Pizzas");
  const otherItems = menuItems.filter(i => i.category_name !== "Pizzas");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <IconArrowLeft />
            </a>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">SliceLine Admin</h1>
              <p className="text-xs text-slate-400">Menu & Configuration</p>
            </div>
          </div>
          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 max-w-[280px]"
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.store_number} — {loc.name} ({loc.city})</option>
            ))}
          </select>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <nav className="flex gap-1 overflow-x-auto">
              {(["locations", "menu", "toppings", "specials", "stock"] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                    activeTab === tab
                      ? "border-red-500 text-white"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >{tab}</button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)}><IconX /></button>
          </div>
        )}

        {activeTab === "locations" && locationDetail && (
          <LocationConfig location={locationDetail} onSave={saveLocationConfig} saving={saving} />
        )}

        {activeTab === "menu" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">Pizzas</h2>
              <button onClick={() => setEditingItem({ category_id: menuItems.find(i => i.category_name === "Pizzas")?.category_id, default_toppings: [] })}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <IconPlus /> Add Pizza
              </button>
            </div>
            <div className="grid gap-3">
              {pizzaItems.map(item => (
                <MenuItemCard key={item.id} item={item} toppings={toppings} onEdit={() => setEditingItem({...item})} />
              ))}
            </div>
            <h2 className="text-lg font-semibold text-slate-800 pt-4">Other Items</h2>
            <div className="grid gap-3">
              {otherItems.map(item => (
                <MenuItemCard key={item.id} item={item} toppings={toppings} onEdit={() => setEditingItem({...item})} />
              ))}
            </div>
            {editingItem && (
              <ItemEditModal item={editingItem} toppings={toppings} onSave={saveItem}
                onClose={() => setEditingItem(null)} saving={saving} />
            )}
          </div>
        )}

        {activeTab === "toppings" && (
          <ToppingsList toppings={toppings} franchiseId={franchiseId} onRefresh={loadToppings} />
        )}

        {activeTab === "stock" && selectedLocation && (
          <StockManager locationId={selectedLocation} locationName={selectedLoc?.name || ""} toppings={toppings} menuItems={menuItems} />
        )}

        {activeTab === "specials" && franchiseId && (
          <SpecialsManager franchiseId={franchiseId} />
        )}
      </main>
    </div>
  );
}

// Location Config Component
function LocationConfig({ location, onSave, saving }: { location: any; onSave: (u: any) => void; saving: boolean }) {
  const [hours, setHours] = useState(location.hours || []);
  const [greeting, setGreeting] = useState(location.phone_greeting || "");
  const [deliveryEnabled, setDeliveryEnabled] = useState(location.delivery_enabled ?? true);
  const [deliveryFee, setDeliveryFee] = useState(Number(location.delivery_fee || 0));
  const [deliveryMinOrder, setDeliveryMinOrder] = useState(Number(location.delivery_min_order || 0));
  const [zones, setZones] = useState(location.delivery_zones || []);

  useEffect(() => {
    setHours(location.hours || []);
    setGreeting(location.phone_greeting || "");
    setDeliveryEnabled(location.delivery_enabled ?? true);
    setDeliveryFee(Number(location.delivery_fee || 0));
    setDeliveryMinOrder(Number(location.delivery_min_order || 0));
    setZones(location.delivery_zones || []);
  }, [location]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Hours of Operation</h3>
        <div className="space-y-2">
          {DAYS.map((day, i) => {
            const h = hours.find((h: any) => h.day === i) || { day: i, open: "11:00", close: "22:00", is_closed: false };
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-medium text-slate-600">{day}</span>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!h.is_closed} onChange={e => {
                    const newHours = [...hours];
                    const idx = newHours.findIndex((x: any) => x.day === i);
                    if (idx >= 0) newHours[idx] = { ...newHours[idx], is_closed: !e.target.checked };
                    else newHours.push({ day: i, open: "11:00", close: "22:00", is_closed: !e.target.checked });
                    setHours(newHours);
                  }} className="rounded" />
                  <span className="text-slate-500">Open</span>
                </label>
                {!h.is_closed && (
                  <>
                    <input type="time" value={h.open} onChange={e => {
                      const newHours = [...hours];
                      const idx = newHours.findIndex((x: any) => x.day === i);
                      if (idx >= 0) newHours[idx] = { ...newHours[idx], open: e.target.value };
                      setHours(newHours);
                    }} className="border border-slate-200 rounded px-2 py-1 text-sm" />
                    <span className="text-slate-400">to</span>
                    <input type="time" value={h.close} onChange={e => {
                      const newHours = [...hours];
                      const idx = newHours.findIndex((x: any) => x.day === i);
                      if (idx >= 0) newHours[idx] = { ...newHours[idx], close: e.target.value };
                      setHours(newHours);
                    }} className="border border-slate-200 rounded px-2 py-1 text-sm" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Phone Greeting</h3>
        <textarea value={greeting} onChange={e => setGreeting(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Delivery Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={deliveryEnabled} onChange={e => setDeliveryEnabled(e.target.checked)} className="rounded" />
            <span className="text-sm font-medium text-slate-700">Delivery Enabled</span>
          </label>
          {deliveryEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">Delivery Fee ($)</label>
                  <input type="number" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Min Order for Delivery ($)</label>
                  <input type="number" step="0.01" value={deliveryMinOrder} onChange={e => setDeliveryMinOrder(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Delivery Zones</label>
                {zones.map((z: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input type="number" value={z.radius_km} onChange={e => {
                      const nz = [...zones]; nz[i] = { ...nz[i], radius_km: Number(e.target.value) }; setZones(nz);
                    }} className="w-20 border border-slate-200 rounded px-2 py-1 text-sm" placeholder="km" />
                    <span className="text-sm text-slate-500">km — $</span>
                    <input type="number" step="0.01" value={z.fee} onChange={e => {
                      const nz = [...zones]; nz[i] = { ...nz[i], fee: Number(e.target.value) }; setZones(nz);
                    }} className="w-20 border border-slate-200 rounded px-2 py-1 text-sm" placeholder="fee" />
                    <button onClick={() => setZones(zones.filter((_: any, j: number) => j !== i))} className="text-red-400 hover:text-red-600"><IconX /></button>
                  </div>
                ))}
                <button onClick={() => setZones([...zones, { radius_km: 10, fee: 7.00 }])}
                  className="text-sm text-red-500 hover:text-red-600 font-medium">+ Add Zone</button>
              </div>
            </>
          )}
        </div>
      </div>

      <button onClick={() => onSave({ hours, phone_greeting: greeting, delivery_enabled: deliveryEnabled, delivery_fee: deliveryFee, delivery_min_order: deliveryMinOrder, delivery_zones: zones })}
        disabled={saving}
        className="bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
        {saving ? "Saving..." : "Save Location Config"}
      </button>
    </div>
  );
}

// Menu Item Card
function MenuItemCard({ item, toppings, onEdit }: { item: any; toppings: any[]; onEdit: () => void }) {
  const reqToppings = (item.default_toppings || []).filter((t: any) => t.is_required).map((t: any) => t.name);
  const optToppings = (item.default_toppings || []).filter((t: any) => !t.is_required).map((t: any) => t.name);
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
          <div className="font-semibold text-slate-700">${Number(item.base_price).toFixed(2)}</div>
          <div className="text-xs text-slate-400">{item.category_name}</div>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={onEdit} className="text-xs text-slate-500 hover:text-red-500 font-medium">Edit</button>
      </div>
    </div>
  );
}

// Item Edit Modal
function ItemEditModal({ item, toppings, onSave, onClose, saving }: { item: any; toppings: any[]; onSave: (i: any) => void; onClose: () => void; saving: boolean }) {
  const [form, setForm] = useState(item);
  const allToppings = toppings.filter(t => t.is_available !== false);

  const toggleTopping = (toppingId: string, isRequired: boolean) => {
    const current = form.default_toppings || [];
    const existing = current.findIndex((t: any) => t.topping_id === toppingId);
    if (existing >= 0) {
      const updated = [...current];
      updated[existing] = { ...updated[existing], is_required: isRequired };
      setForm({ ...form, default_toppings: updated });
    } else {
      const topping = allToppings.find(t => t.id === toppingId);
      setForm({ ...form, default_toppings: [...current, { topping_id: toppingId, name: topping?.name, is_required: isRequired, price: topping?.base_price, is_premium: topping?.is_premium, display_order: current.length }] });
    }
  };

  const removeTopping = (toppingId: string) => {
    setForm({ ...form, default_toppings: (form.default_toppings || []).filter((t: any) => t.topping_id !== toppingId) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{item.id ? "Edit" : "New"} Menu Item</h3>
          <button onClick={onClose}><IconX /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input type="text" value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm h-16 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Base Price ($)</label>
              <input type="number" step="0.01" value={form.base_price || ""} onChange={e => setForm({...form, base_price: Number(e.target.value)})}
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <input type="checkbox" checked={form.is_available !== false} onChange={e => setForm({...form, is_available: e.target.checked})} className="rounded" />
                Available
              </label>
            </div>
          </div>

          {/* Toppings (for pizzas) */}
          {form.category_id && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Default Toppings</label>
              <div className="space-y-1.5">
                {(form.default_toppings || []).map((t: any) => (
                  <div key={t.topping_id} className="flex items-center gap-2 text-sm bg-slate-50 rounded px-3 py-1.5">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={t.is_required} onChange={() => toggleTopping(t.topping_id, !t.is_required)} className="rounded" />
                      <span className="text-xs text-slate-500">Required</span>
                    </label>
                    <span className="flex-1 font-medium text-slate-700">{t.name}</span>
                    {t.is_premium && <span className="text-xs text-amber-600 font-medium">Premium</span>}
                    <span className="text-xs text-slate-400">${Number(t.price).toFixed(2)}</span>
                    <button onClick={() => removeTopping(t.topping_id)} className="text-slate-400 hover:text-red-500"><IconX /></button>
                  </div>
                ))}
                <select onChange={e => { if (e.target.value) toggleTopping(e.target.value, true); e.target.value = ""; }}
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-500">
                  <option value="">+ Add topping...</option>
                  {allToppings.filter(t => !(form.default_toppings || []).some((ft: any) => ft.topping_id === t.id))
                    .map(t => <option key={t.id} value={t.id}>{t.name} (${Number(t.base_price).toFixed(2)}){t.is_premium ? " - Premium" : ""}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
            <button onClick={() => onSave(form)} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white disabled:bg-slate-300 transition-colors">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toppings List
function ToppingsList({ toppings, franchiseId, onRefresh }: { toppings: any[]; franchiseId: string; onRefresh: () => void }) {
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("1.50");
  const [newPremium, setNewPremium] = useState(false);

  const addTopping = async () => {
    if (!newName.trim()) return;
    await fetch(`${API_URL}/api/admin/toppings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ franchise_id: franchiseId, name: newName, base_price: Number(newPrice), is_premium: newPremium }),
    });
    setNewName("");
    setNewPrice("1.50");
    setNewPremium(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Add Topping</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500">Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="e.g. Truffle Oil" />
          </div>
          <div className="w-24">
            <label className="text-xs font-medium text-slate-500">Price ($)</label>
            <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 py-2">
            <input type="checkbox" checked={newPremium} onChange={e => setNewPremium(e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-600">Premium</span>
          </label>
          <button onClick={addTopping} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Add</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Topping</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">Price</th>
              <th className="px-4 py-3 text-center font-medium text-slate-500">Premium</th>
              <th className="px-4 py-3 text-center font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {toppings.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5 font-medium text-slate-700">{t.name}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">${Number(t.base_price).toFixed(2)}</td>
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

// Stock Manager
function StockManager({ locationId, locationName, toppings, menuItems }: { locationId: string; locationName: string; toppings: any[]; menuItems: any[]; }) {
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStock = () => {
    setLoading(true);
    fetch(`${API_URL}/api/admin/locations/${locationId}/stock`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setStock(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  };

  useEffect(loadStock, [locationId]);

  const toggleStock = async (itemType: string, itemId: string, itemName: string) => {
    const existing = stock?.[itemType === 'menu_item' ? 'menu_items' : 'toppings']?.find((s: any) => s.item_id === itemId);
    if (existing) {
      // Remove stock entry (set back to in_stock)
      await fetch(`${API_URL}/api/admin/locations/${locationId}/stock/${existing.id}`, { method: 'DELETE' });
    } else {
      // Mark as out of stock
      await fetch(`${API_URL}/api/admin/locations/${locationId}/stock`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ item_type: itemType, item_id: itemId, stock_status: "out_of_stock" }] }),
      });
    }
    loadStock();
  };

  const oosItems = new Set((stock?.menu_items || []).filter((s: any) => s.stock_status === 'out_of_stock').map((s: any) => s.item_id));
  const oosToppings = new Set((stock?.toppings || []).filter((s: any) => s.stock_status === 'out_of_stock').map((s: any) => s.item_id));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-1">Stock for {locationName}</h3>
        <p className="text-sm text-slate-500 mb-4">Click items to toggle in/out of stock. Topping outages cascade to affected pizzas.</p>

        <h4 className="text-sm font-semibold text-slate-700 mb-2">Toppings</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          {toppings.map(t => (
            <button key={t.id} onClick={() => toggleStock('topping', t.id, t.name)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                oosToppings.has(t.id) ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}>
              <span>{t.name}</span>
              {oosToppings.has(t.id) && <span className="ml-1 text-xs">(OUT)</span>}
            </button>
          ))}
        </div>

        <h4 className="text-sm font-semibold text-slate-700 mb-2">Menu Items</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {menuItems.filter(i => i.category_name === 'Pizzas').map(item => {
            const unavailable = !item.is_available || item.unavailable_reason;
            return (
              <button key={item.id} onClick={() => toggleStock('menu_item', item.id, item.name)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  unavailable ? 'bg-red-50 text-red-700 border border-red-200' : oosItems.has(item.id) ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}>
                <span>{item.name}</span>
                {unavailable && <span className="block text-xs text-red-500">{item.unavailable_reason || 'Unavailable'}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Specials Manager
function SpecialsManager({ franchiseId }: { franchiseId: string }) {
  const [specials, setSpecials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/admin/franchises/${franchiseId}/specials`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setSpecials(data.specials || []); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [franchiseId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Specials & Promotions</h3>
      {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
        <div className="space-y-3">
          {specials.map(s => (
            <div key={s.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {s.discount_type === 'percentage' ? `${s.discount_value}% off` : s.discount_type === 'fixed' ? `$${Number(s.discount_value).toFixed(2)} off` : s.discount_type}
                </span>
              </div>
              {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
            </div>
          ))}
          {specials.length === 0 && <p className="text-sm text-slate-400">No specials configured yet.</p>}
        </div>
      )}
    </div>
  );
}