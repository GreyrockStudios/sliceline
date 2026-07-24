'use strict';

const BasePOSAdapter = require('./baseAdapter');

/**
 * Clover POS Adapter
 *
 * Integrates with Clover REST API v3.
 * Config: { accessToken, merchantId, environment: 'sandbox'|'production' }
 *
 * Reference: https://docs.clover.com/reference
 */
class CloverAdapter extends BasePOSAdapter {
  constructor(config) {
    super(config);
    this.accessToken = config.accessToken;
    this.merchantId = config.merchantId;
    this.environment = config.environment || 'sandbox';
    this.baseUrl = this.environment === 'production'
      ? 'https://api.clover.com'
      : 'https://sandbox.dev.clover.com';
    this._version = 'v3';
  }

  get name() {
    return 'clover';
  }

  // ─── HTTP Helper ─────────────────────────────────────────────────────

  async _request(method, path, body = null) {
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}/${this._version}/merchants/${this.merchantId}${path}`, opts);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Clover API ${method} ${path} failed (${res.status}): ${text}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return null;
  }

  // ─── Required Methods ────────────────────────────────────────────────

  async submitOrder(order) {
    const lineItems = (order.items || []).map((item, idx) => ({
      name: item.name || `Item ${idx + 1}`,
      price: this.formatCurrency(item.unit_price),
      quantity: item.quantity || 1,
      note: item.special_requests || '',
    }));

    const orderBody = {
      id: order.order_number || undefined,
      title: `SliceLine Order ${order.order_number || ''}`,
      total: this.formatCurrency(order.total || 0),
      tax: this.formatCurrency(order.tax || 0),
      state: 'open',
      orderType: order.order_type === 'delivery' ? 'delivery' : 'pickup',
      customers: order.customer_name ? [{
        firstName: order.customer_name.split(' ')[0] || '',
        lastName: order.customer_name.split(' ').slice(1).join(' ') || '',
        phoneNumbers: order.customer_phone ? [{ number: this.formatPhone(order.customer_phone) }] : [],
      }] : [],
      lineItems,
    };

    if (order.order_type === 'delivery' && order.delivery_address) {
      orderBody.deliveryAddress = {
        address1: (order.delivery_address || '').split(',')[0] || '',
        city: (order.delivery_address || '').split(',').slice(1).join(',').trim() || '',
        country: 'CA',
      };
      orderBody.deliveryNote = order.delivery_instructions || '';
    }

    const result = await this._request('POST', '/orders', orderBody);

    return {
      posOrderId: result.id || result.uuid || '',
      status: this._mapCloverStatus(result.state || 'open'),
      raw: result,
    };
  }

  async getOrderStatus(posOrderId) {
    const result = await this._request('GET', `/orders/${posOrderId}`);

    return {
      status: this._mapCloverStatus(result.state),
      estimatedReadyTime: result.expectedTime || result.prepTime || null,
      raw: result,
    };
  }

  async syncMenu(locationId) {
    const categories = [];
    const items = [];

    // Fetch categories
    try {
      const catResult = await this._request('GET', '/categories?limit=1000');
      const catElements = catResult.elements || [];
      for (const cat of catElements) {
        categories.push({
          name: cat.name || 'Uncategorized',
          slug: (cat.name || 'uncategorized').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          pos_id: cat.id,
        });
      }
    } catch (err) {
      // Categories may not be set up; continue with items only
    }

    // Fetch items
    const itemResult = await this._request('GET', '/items?limit=1000&expand=itemStock');
    const itemElements = itemResult.elements || [];

    for (const item of itemElements) {
      const price = item.price || 0;
      const stockCount = item.itemStock?.stockCount;

      items.push({
        pos_id: item.id,
        name: item.name || '',
        description: item.description || '',
        base_price: this.centsToDollars(price),
        category_name: categories.find(c => c.pos_id === item.category?.id)?.name || 'Uncategorized',
        sizes: (item.variations || []).map(v => ({
          name: v.name || 'Regular',
          price: this.centsToDollars(v.price || 0),
        })),
        is_available: stockCount === null || stockCount === undefined || stockCount > 0,
      });
    }

    return { categories, items, syncedAt: new Date().toISOString() };
  }

  async getAvailability(locationId) {
    try {
      // Check merchant business hours
      const result = await this._request('GET', '');
      // Clover merchant endpoint returns merchant info
      const merchant = result;

      return {
        available: true, // Clover doesn't have a simple "open" flag
        reason: undefined,
      };
    } catch (err) {
      return { available: true, reason: 'Availability check failed, assuming open' };
    }
  }

  async validateOrder(order) {
    const errors = [];
    const warnings = [];

    for (const item of (order.items || [])) {
      if (!item.name) errors.push(`Item missing name: ${JSON.stringify(item)}`);
      if (item.unit_price == null || item.unit_price <= 0) {
        warnings.push(`Item "${item.name}" has no price — verify with Clover`);
      }
    }

    if (order.order_type === 'delivery' && !order.delivery_address) {
      errors.push('Delivery address required for delivery orders');
    }

    // Check inventory for items
    try {
      const itemIds = (order.items || [])
        .filter(i => i.menu_item_id)
        .map(i => i.menu_item_id);

      for (const itemId of itemIds) {
        const stockResult = await this._request('GET', `/item_stock?itemId=${itemId}`);
        const stock = stockResult?.stockCount;
        if (stock !== undefined && stock !== null && stock <= 0) {
          warnings.push(`Item ${itemId} may be out of stock on Clover`);
        }
      }
    } catch (err) {
      // Stock check is best-effort; don't block on failure
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ─── Clover-Specific Mapping ─────────────────────────────────────────

  _mapCloverStatus(cloverState) {
    const map = {
      'open': 'submitted',
      'locked': 'confirmed',
      'paid': 'completed',
      'refunded': 'cancelled',
      'deleted': 'cancelled',
    };
    return map[cloverState] || cloverState?.toLowerCase() || 'unknown';
  }
}

module.exports = CloverAdapter;