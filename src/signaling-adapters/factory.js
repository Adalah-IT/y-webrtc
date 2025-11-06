/**
 * @module signaling-adapters/factory
 */

import { SignalingAdapter } from './SignalingAdapter.js'
import { DefaultSignalingAdapter } from './DefaultSignalingAdapter.js'
import { LaravelEchoAdapter } from './LaravelEchoAdapter.js'

/**
 * Factory function to create a signaling adapter from configuration
 *
 * @param {string | SignalingAdapter | { type: 'default' | 'echo', url?: string, echo?: any }} config
 * @returns {SignalingAdapter}
 */
export function createSignalingAdapter (config) {
  // If it's already an adapter instance, return it
  if (config instanceof SignalingAdapter) {
    return config
  }

  // If it's a string, treat it as a URL for the default adapter
  if (typeof config === 'string') {
    return new DefaultSignalingAdapter()
  }

  // If it's a configuration object
  if (typeof config === 'object' && config !== null) {
    switch (config.type) {
      case 'echo':
        if (!config.echo) {
          throw new Error('Laravel Echo instance is required for LaravelEchoAdapter')
        }
        return new LaravelEchoAdapter(config.echo)
      case 'default':
      default:
        return new DefaultSignalingAdapter()
    }
  }

  // Default to DefaultSignalingAdapter
  return new DefaultSignalingAdapter()
}
