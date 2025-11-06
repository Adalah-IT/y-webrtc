/**
 * @module signaling-adapters/factory
 */

import { SignalingAdapter } from './SignalingAdapter.js'
import { DefaultSignalingAdapter } from './DefaultSignalingAdapter.js'
import { LaravelEchoAdapter } from './LaravelEchoAdapter.js'
import { LaravelEchoPresenceAdapter } from './LaravelEchoPresenceAdapter.js'

/**
 * @typedef {Object} PresenceCallbacks
 * @property {(members: any[]) => void} [onHere] - Called when subscription succeeds with list of all members
 * @property {(member: any) => void} [onJoining] - Called when a new member joins the channel
 * @property {(member: any) => void} [onLeaving] - Called when a member leaves the channel
 * @property {(error: any, channelName: string) => void} [onError] - Called when there's an error subscribing to a channel
 * @property {(channelName: string) => void} [onSubscribed] - Called when successfully subscribed to a channel
 */

/**
 * Factory function to create a signaling adapter from configuration
 *
 * @param {string | SignalingAdapter | { type: 'default' | 'echo' | 'echo-presence', url?: string, echo?: any, callbacks?: PresenceCallbacks }} config
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
      case 'echo-presence':
        if (!config.echo) {
          throw new Error('Laravel Echo instance is required for LaravelEchoPresenceAdapter')
        }
        return new LaravelEchoPresenceAdapter(config.echo, config.callbacks)
      case 'default':
      default:
        return new DefaultSignalingAdapter()
    }
  }

  // Default to DefaultSignalingAdapter
  return new DefaultSignalingAdapter()
}
