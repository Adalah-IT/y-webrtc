/**
 * @module signaling-adapters/SignalingAdapter
 */

import * as error from 'lib0/error'
import { Observable } from 'lib0/observable'

/**
 * Base class for signaling adapters.
 * Adapters provide different ways to connect to signaling servers.
 *
 * @extends Observable<string>
 */
export class SignalingAdapter extends Observable {
  constructor () {
    super()
    /**
     * @type {boolean}
     */
    this.connected = false
  }

  /**
   * Connect to the signaling server
   * @param {string} url - The URL of the signaling server
   */
  connect (url) {
    error.methodUnimplemented()
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect () {
    error.methodUnimplemented()
  }

  /**
   * Subscribe to topics (rooms)
   * @param {Array<string>} topics - Array of topic names to subscribe to
   */
  subscribe (topics) {
    error.methodUnimplemented()
  }

  /**
   * Unsubscribe from topics (rooms)
   * @param {Array<string>} topics - Array of topic names to unsubscribe from
   */
  unsubscribe (topics) {
    error.methodUnimplemented()
  }

  /**
   * Publish a message to a topic
   * @param {string} topic - The topic to publish to
   * @param {any} data - The data to publish
   */
  publish (topic, data) {
    error.methodUnimplemented()
  }

  /**
   * Destroy the adapter and cleanup resources
   */
  destroy () {
    super.destroy()
  }
}
