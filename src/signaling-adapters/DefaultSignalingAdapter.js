/**
 * @module signaling-adapters/DefaultSignalingAdapter
 */

import * as ws from 'lib0/websocket'
import { SignalingAdapter } from './SignalingAdapter.js'

/**
 * Default WebSocket-based signaling adapter.
 * This adapter maintains the same behavior as the original implementation.
 *
 * @extends SignalingAdapter
 */
export class DefaultSignalingAdapter extends SignalingAdapter {
  constructor () {
    super()
    /**
     * @type {ws.WebsocketClient | null}
     */
    this.ws = null
    /**
     * @type {string}
     */
    this.url = ''
  }

  /**
   * @param {string} url
   */
  connect (url) {
    if (this.ws) {
      this.disconnect()
    }

    this.url = url
    this.ws = new ws.WebsocketClient(url)

    this.ws.on('connect', () => {
      this.connected = true
      this.emit('connect', [])
    })

    this.ws.on('disconnect', () => {
      this.connected = false
      this.emit('disconnect', [])
    })

    this.ws.on('message', (message) => {
      if (message.type === 'publish') {
        this.emit('message', [{ topic: message.topic, data: message.data }])
      }
    })
  }

  disconnect () {
    if (this.ws) {
      this.ws.disconnect()
      this.ws = null
    }
    this.connected = false
  }

  /**
   * @param {Array<string>} topics
   */
  subscribe (topics) {
    if (this.ws && this.connected) {
      this.ws.send({ type: 'subscribe', topics })
    }
  }

  /**
   * @param {Array<string>} topics
   */
  unsubscribe (topics) {
    if (this.ws && this.connected) {
      this.ws.send({ type: 'unsubscribe', topics })
    }
  }

  /**
   * @param {string} topic
   * @param {any} data
   */
  publish (topic, data) {
    if (this.ws && this.connected) {
      this.ws.send({ type: 'publish', topic, data })
    }
  }

  destroy () {
    this.disconnect()
    super.destroy()
  }
}
