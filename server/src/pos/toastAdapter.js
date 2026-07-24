'use strict';

const BasePOSAdapter = require('./baseAdapter');

/**
 * Toast POS Adapter
 *
 * Integrates with Toast REST API v1.
 * Config: { clientId, clientSecret, locationId, restaurantGuid }
 *
 * Reference: https://doc.toasttab.com/docs
 */
class ToastAdapter extends BasePOSAdapter {
  constructor(config) {
    super(config);
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.locationId = config.locationId;
    this.restaurantGuid = config.restaurantGuid;
    this.baseUrl = config.baseUrl || 'https://ws-api.toasttab.com';
    this._tokenCache = { token: null, expiresAt: 0 };
  }

  get name() {
    return 'toast';
  }

  // ─── OAuth2 Token Management ─────────────────────────────────────────

  async _getAccessToken() {
    const now = Date.now();
    if (this._tokenCache.token && this._tokenCache.expiresAt > now) {
      return this._tokenCache.token;
    }

    const res = await fetch(`${this.baseUrl}/user/v1/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Toast auth failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    this._tokenCache = {
      token: data.access_token || data.accessToken,
      expiresAt: now + ((data.expires_in || data.expiresIn || 3600) * 1000) - 30_000, // 30s buffer
    };
    return this._tokenCache.token;
  }

  async _request(method, path, body = null) {
    const token = await this._getAccessToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Toast-Restaurant-External-ID': this.restaurantGuid,
    };

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${path}`, opts);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Toast API ${method} ${path} failed (${res.status}): ${text}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return null;
  }

  // ─── Required Methods ────────────────────────────────────────────────

  async submitOrder(order) {
    const toastOrder = this._mapToToastOrder(order);

    const result = await this._request('POST', '/orders/v2/orders', toastOrder);

    return {
      posOrderId: result.guid || result.id || '',
      status: this._mapToastStatus(result.status || 'NEW'),
      raw: result,
    };
  }

  async getOrderStatus(posOrderId) {
    const result = await this._request('GET', `/orders/v2/orders/${posOrderId}`);

    return {
      status: this._mapToastStatus(result.status),
      estimatedReadyTime: result.promisedTime || result.estimatedFulfillTime || null,
      raw: result,
    };
  }

  async syncMenu(locationId) {
    const result = await this._request('GET', '/menus/v2/menus');

    const categories = [];
    const items = [];

    // Toast returns menus with menuGroups containing items
    const menus = Array.isArray(result) ? result : (result.menus || [result]);
    for (const menu of menus) {
      const groups = menu.menuGroups || menu.groups || [];
      for (const group of groups) {
        categories.push({
          name: group.name,
          slug: (group.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          pos_id: group.guid || group.id,
        });

        const menuItems = group.menuItems || group.items || [];
        for (const mi of menuItems) {
          items.push({
            pos_id: mi.guid || mi.id,
            name: mi.name,
            description: mi.description || '',
            base_price: mi.price || mi.basePrice || 0,
            category_name: group.name,
            sizes: (mi.sizes || []).map(s => ({
              name: s.name,
              price: s.price || s.priceWithDefaultTax || 0,
            })),
            is_available: mi.available !== false,
          });
        }
      }
    }

    return { categories, items, syncedAt: new Date().toISOString() };
  }

  async getAvailability(locationId) {
    try {
      // Check restaurant operational status
      const result = await this._request('GET', '/restaurants/v1/restaurants');
      const restaurant = Array.isArray(result) ? result[0] : result;

      const isOpen = restaurant?.operationalStatus === 'OPEN'
        || restaurant?.open === true;

      return {
        available: isOpen !== false,
        reason: isOpen === false ? 'Restaurant is closed on POS' : undefined,
        estimatedWaitMinutes: restaurant?.estimatedDeliveryTime || undefined,
      };
    } catch (err) {
      // If we can't reach Toast, assume available (don't block orders)
      return { available: true, reason: 'Availability check failed, assuming open' };
    }
  }

  async validateOrder(order) {
    const errors = [];
    const warnings = [];

    // Check items are available and pricing is correct
    for (const item of (order.items || [])) {
      if (!item.name) errors.push(`Item missing name: ${JSON.stringify(item)}`);
      if (item.unit_price == null || item.unit_price <= 0) {
        warnings.push(`Item "${item.name}" has no price set — verify with POS`);
      }
    }

    // Check delivery area if delivery order
    if (order.order_type === 'delivery' && !order.delivery_address) {
      errors.push('Delivery address is required for delivery orders');
    }

    // Minimum order check (Toast may enforce this, but we check locally too)
    if (order.subtotal > 0 && order.subtotal < 10) {
      warnings.push('Order subtotal is below typical minimum');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ─── Toast-Specific Mapping ──────────────────────────────────────────

  _mapToToastOrder(order) {
    const items = (order.items || []).map((item, idx) => ({
      menuItem: item.menu_item_id
        ? { guid: item.menu_item_id }
        : { name: item.name },
      quantity: item.quantity || 1,
      price: this.formatCurrency(item.unit_price),
      name: item.name,
      selections: [],
      specialInstructions: item.special_requests || '',
    }));

    const customer = order.customer_name || 'Walk-in';

    return {
      restaurantGuid: this.restaurantGuid,
      externalId: order.order_number || order.id,
      checkSelections: items,
      deliveryInfo: order.order_type === 'delivery' ? {
        deliverTo: {
          address1: (order.delivery_address || '').split(',')[0] || '',
          city: (order.delivery_address || '').split(',').slice(1).join(',').trim() || '',
        },
        instructions: order.delivery_instructions || '',
      } : undefined,
      guest: {
        firstName: customer.split(' ')[0] || customer,
        lastName: customer.split(' ').slice(1).join(' ') || '',
        phone: this.formatPhone(order.customer_phone),
      },
      notes: order.notes || '',
    };
  }

  _mapToastStatus(toastStatus) {
    const map = {
      'NEW': 'submitted',
      'IN_PROGRESS': 'preparing',
      'READY': 'ready',
      'PICKED_UP': 'completed',
      'DELIVERED': 'completed',
      'CANCELLED': 'cancelled',
      'REFUNDED': 'cancelled',
    };
    return map[toastStatus] || toastStatus?.toLowerCase() || 'unknown';
  }
}

module.exports = ToastAdapter;