'use strict';

/**
 * BasePOSAdapter — Abstract base class for POS integrations.
 *
 * Every POS adapter must extend this class and implement all methods
 * that throw "Not implemented". Utility methods (name, formatPhone,
 * formatCurrency) have default implementations.
 */
class BasePOSAdapter {
  /**
   * @param {object} config — Adapter-specific configuration (API keys, location IDs, etc.)
   */
  constructor(config) {
    if (new.target === BasePOSAdapter) {
      throw new Error('BasePOSAdapter cannot be instantiated directly');
    }
    this.config = config;
  }

  // ─── Required methods (override in subclass) ────────────────────────

  /**
   * Submit an order to the POS system.
   * @param {object} order — Sliceline order object (from orders table)
   * @returns {Promise<{posOrderId: string, status: string, raw?: object}>}
   */
  async submitOrder(order) {
    throw new Error('Not implemented: submitOrder');
  }

  /**
   * Get the current status of an order in the POS.
   * @param {string} posOrderId — POS-specific order identifier
   * @returns {Promise<{status: string, estimatedReadyTime?: string, raw?: object}>}
   */
  async getOrderStatus(posOrderId) {
    throw new Error('Not implemented: getOrderStatus');
  }

  /**
   * Sync the POS menu into Sliceline's menu_items format.
   * @param {string} locationId — Sliceline location UUID
   * @returns {Promise<{categories: object[], items: object[], syncedAt: string}>}
   */
  async syncMenu(locationId) {
    throw new Error('Not implemented: syncMenu');
  }

  /**
   * Check if the POS location is currently accepting orders.
   * @param {string} locationId — Sliceline location UUID
   * @returns {Promise<{available: boolean, reason?: string, estimatedWaitMinutes?: number}>}
   */
  async getAvailability(locationId) {
    throw new Error('Not implemented: getAvailability');
  }

  /**
   * Validate an order before submission (item availability, pricing, delivery area).
   * @param {object} order — Sliceline order object
   * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateOrder(order) {
    throw new Error('Not implemented: validateOrder');
  }

  // ─── Utility methods ────────────────────────────────────────────────

  /** Human-readable adapter name */
  get name() {
    return 'base';
  }

  /**
   * Strip non-digit characters from a phone number.
   * @param {string} phone
   * @returns {string}
   */
  formatPhone(phone) {
    return (phone || '').replace(/\D/g, '');
  }

  /**
   * Convert a dollar amount to cents (integer).
   * @param {number} amount
   * @returns {number}
   */
  formatCurrency(amount) {
    return Math.round((amount || 0) * 100);
  }

  /**
   * Convert cents back to dollars.
   * @param {number} cents
   * @returns {number}
   */
  centsToDollars(cents) {
    return (cents || 0) / 100;
  }
}

module.exports = BasePOSAdapter;