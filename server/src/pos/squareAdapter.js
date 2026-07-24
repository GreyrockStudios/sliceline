'use strict';

const BasePOSAdapter = require('./baseAdapter');

/**
 * Square POS Adapter
 *
 * Integrates with Square API v2.
 * Config: { accessToken, locationId, environment: 'sandbox'|'production' }
 *
 * Reference: https://developer.squareup.com/reference/square
 */
class SquareAdapter extends BasePOSAdapter {
  constructor(config) {
    super(config);
    this.accessToken = config.accessToken;
    this.locationId = config.locationId;
    this.environment = config.environment || 'sandbox';
    this.baseUrl = this.environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    this._version = '2024-06-17'; // Square API version
  }

  get name() {
    return 'square';
  }

  // ─── HTTP Helper ─────────────────────────────────────────────────────

  async _request(method, path, body = null) {
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': this._version,
    };

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${path}`, opts);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Square API ${method} ${path} failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data;
  }

  // ─── Required Methods ────────────────────────────────────────────────

  async submitOrder(order) {
    const lineItems = (order.items || []).map((item, idx) => ({
      uid: `item-${idx}`,
      name: item.name || `Item ${idx + 1}`,
      quantity: String(item.quantity || 1),
      base_price_money: {
        amount: this.formatCurrency(item.unit_price),
        currency: 'CAD',
      },
      gross_amount_money: {
        amount: this.formatCurrency(item.unit_price * (item.quantity || 1)),
        currency: 'CAD',
      },
      note: item.special_requests || '',
    }));

    const orderBody = {
      idempotency_key: order.id || order.order_number || `sl-${Date.now()}`,
      order: {
        location_id: this.locationId,
        reference_id: order.order_number || order.id,
        line_items: lineItems,
        metadata: {
          sliceline_order_id: order.id || '',
          customer_name: order.customer_name || 'Walk-in',
          order_type: order.order_type || 'pickup',
        },
      },
    };

    // Add taxes
    if (order.tax > 0) {
      orderBody.order.taxes = [{
        uid: 'hst-tax',
        name: 'HST',
        percentage: '13',
        scope: 'ORDER',
        type: 'ADDITIVE',
      }];
    }

    // Add delivery info if applicable
    if (order.order_type === 'delivery' && order.delivery_address) {
      orderBody.order.fulfillments = [{
        type: 'SHIPMENT',
        state: 'PROPOSED',
        shipment_details: {
          recipient: {
            display_name: order.customer_name || 'Customer',
            phone_number: this.formatPhone(order.customer_phone || ''),
            address: {
              address_line_1: (order.delivery_address || '').split(',')[0] || '',
              locality: (order.delivery_address || '').split(',').slice(1).join(',').trim() || '',
              country: 'CA',
            },
          },
        },
      }];
    } else {
      orderBody.order.fulfillments = [{
        type: 'PICKUP',
        state: 'PROPOSED',
        pickup_details: {
          recipient: {
            display_name: order.customer_name || 'Customer',
            phone_number: this.formatPhone(order.customer_phone || ''),
          },
        },
      }];
    }

    const result = await this._request('POST', '/v2/orders', orderBody);

    const squareOrder = result.order || {};
    return {
      posOrderId: squareOrder.id || '',
      status: this._mapSquareStatus(squareOrder.state || 'OPEN'),
      raw: result,
    };
  }

  async getOrderStatus(posOrderId) {
    const result = await this._request('GET', `/v2/orders/${posOrderId}`);
    const sqOrder = result.order || {};

    return {
      status: this._mapSquareStatus(sqOrder.state),
      estimatedReadyTime: sqOrder.fulfillments?.[0]?.pickup_details?.pickup_at || null,
      raw: result,
    };
  }

  async syncMenu(locationId) {
    let cursor = null;
    const categories = [];
    const items = [];
    const categoryMap = {};

    do {
      const params = new URLSearchParams({ types: 'ITEM' });
      if (cursor) params.set('cursor', cursor);

      const result = await this._request('GET', `/v2/catalog/list?${params}`);

      for (const obj of (result.objects || [])) {
        if (obj.type === 'CATEGORY') {
          categoryMap[obj.id] = obj.category_data?.name || 'Uncategorized';
          categories.push({
            name: obj.category_data?.name || 'Uncategorized',
            slug: (obj.category_data?.name || 'uncategorized').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            pos_id: obj.id,
          });
        } else if (obj.type === 'ITEM') {
          const itemData = obj.item_data || {};
          const variation = itemData.variations?.[0] || {};
          const priceMoney = variation.item_variation_data?.price_money || {};

          items.push({
            pos_id: obj.id,
            name: itemData.name || '',
            description: itemData.description || itemData.description_plaintext || '',
            base_price: this.centsToDollars(priceMoney.amount || 0),
            category_name: categoryMap[itemData.category_id] || 'Uncategorized',
            sizes: (itemData.variations || []).map(v => ({
              name: v.item_variation_data?.name || 'Regular',
              price: this.centsToDollars(v.item_variation_data?.price_money?.amount || 0),
            })),
            is_available: true, // Square doesn't have a simple "available" flag
          });
        }
      }

      cursor = result.cursor || null;
    } while (cursor);

    return { categories, items, syncedAt: new Date().toISOString() };
  }

  async getAvailability(locationId) {
    try {
      // Check location business hours
      const result = await this._request('GET', `/v2/locations/${this.locationId}`);
      const loc = result.location || {};

      // Square returns business_hours but doesn't indicate if currently open
      // In production, compare current time against business_hours
      return {
        available: loc.status !== 'INACTIVE',
        reason: loc.status === 'INACTIVE' ? 'Location is inactive on Square' : undefined,
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
        warnings.push(`Item "${item.name}" has no price — verify with Square`);
      }
    }

    if (order.order_type === 'delivery' && !order.delivery_address) {
      errors.push('Delivery address required for delivery orders');
    }

    // Square has minimum order amounts in some configurations
    if (order.subtotal > 0 && order.subtotal < 5) {
      warnings.push('Order subtotal below typical minimum');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ─── Square-Specific Mapping ─────────────────────────────────────────

  _mapSquareStatus(squareState) {
    const map = {
      'OPEN': 'submitted',
      'COMPLETED': 'completed',
      'CANCELED': 'cancelled',
      'DRAFT': 'pending',
      'FULFILLED': 'completed',
    };
    return map[squareState] || squareState?.toLowerCase() || 'unknown';
  }
}

module.exports = SquareAdapter;