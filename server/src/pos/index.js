'use strict';

const ToastAdapter = require('./toastAdapter');
const SquareAdapter = require('./squareAdapter');
const CloverAdapter = require('./cloverAdapter');

/**
 * POS Adapter Registry
 *
 * Usage:
 *   const { getAdapter, listAdapters } = require('./pos');
 *   const adapter = getAdapter('toast', { clientId, clientSecret, ... });
 *   const result = await adapter.submitOrder(order);
 */

const registry = new Map();

/**
 * Register a POS adapter class.
 * @param {string} name — Unique adapter identifier (e.g. 'toast', 'square', 'clover')
 * @param {typeof import('./baseAdapter').default} AdapterClass — Class extending BasePOSAdapter
 */
function registerAdapter(name, AdapterClass) {
  if (typeof AdapterClass !== 'function') {
    throw new Error(`Adapter "${name}" must be a class or constructor function`);
  }
  registry.set(name.toLowerCase(), AdapterClass);
}

/**
 * Get an instance of a registered POS adapter.
 * @param {string} name — Adapter identifier
 * @param {object} config — Adapter-specific configuration
 * @returns {import('./baseAdapter').default}
 */
function getAdapter(name, config = {}) {
  const key = name.toLowerCase();
  const AdapterClass = registry.get(key);
  if (!AdapterClass) {
    throw new Error(`POS adapter "${name}" not registered. Available: ${listAdapters().join(', ')}`);
  }
  return new AdapterClass(config);
}

/**
 * List all registered adapter names.
 * @returns {string[]}
 */
function listAdapters() {
  return Array.from(registry.keys());
}

// ─── Pre-register built-in adapters ────────────────────────────────────
registerAdapter('toast', ToastAdapter);
registerAdapter('square', SquareAdapter);
registerAdapter('clover', CloverAdapter);

module.exports = {
  registerAdapter,
  getAdapter,
  listAdapters,
  // Also export base class and individual adapters for direct use
  BasePOSAdapter: require('./baseAdapter'),
  ToastAdapter,
  SquareAdapter,
  CloverAdapter,
};