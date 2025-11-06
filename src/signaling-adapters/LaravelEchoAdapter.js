/**
 * @module signaling-adapters/LaravelEchoAdapter
 */

import { SignalingAdapter } from './SignalingAdapter.js'

/**
 * Laravel Echo adapter for signaling.
 * This adapter allows using Laravel Echo as the signaling mechanism.
 *
 * @extends SignalingAdapter
 */
export class LaravelEchoAdapter extends SignalingAdapter {
  /**
   * @param {any} echoInstance - Laravel Echo instance
   */
  constructor (echoInstance) {
    super()
    /**
     * @type {any}
     */
    this.echo = echoInstance
    /**
     * @type {Map<string, any>}
     */
    this.channels = new Map()
    /**
     * @type {Set<string>}
     */
    this.readyChannels = new Set()
    /**
     * @type {Map<string, Array<any>>}
     */
    this.messageQueue = new Map()
    /**
     * @type {boolean}
     */
    this.shouldConnect = false
  }

  /**
   * @param {string} url - Not used for Echo, but kept for interface compatibility
   */
  connect (url) {
    this.shouldConnect = true
    this.connected = true
    // Echo maintains its own connection, so we just mark as connected
    // and emit the connect event
    setTimeout(() => {
      this.emit('connect', [])
    }, 0)
  }

  disconnect () {
    this.shouldConnect = false
    this.connected = false
    // Leave all channels
    this.channels.forEach((channel, topic) => {
      this.echo.leave(this._getChannelName(topic))
    })
    this.channels.clear()
    this.readyChannels.clear()
    this.messageQueue.clear()
    this.emit('disconnect', [])
  }

  /**
   * Get the channel name for a topic
   * @param {string} topic
   * @returns {string}
   */
  _getChannelName (topic) {
    // Use private channel for y-webrtc rooms
    // You can customize this based on your Laravel setup
    return `y-webrtc.${topic}`
  }

  /**
   * @param {Array<string>} topics
   */
  subscribe (topics) {
    if (!this.shouldConnect || !this.echo) return

    topics.forEach(topic => {
      if (this.channels.has(topic)) return

      const channelName = this._getChannelName(topic)
      const channel = this.echo.private(channelName)

      // Wait for subscription to be ready before allowing whispers
      channel.subscribed(() => {
        this.readyChannels.add(topic)

        // Flush any queued messages
        const queuedMessages = this.messageQueue.get(topic) || []
        queuedMessages.forEach(data => {
          channel.whisper('signaling', data)
        })
        this.messageQueue.delete(topic)
      })

      // Handle subscription errors
      channel.error((error) => {
        console.error(`LaravelEchoAdapter: Error subscribing to ${channelName}:`, error)
      })

      // Listen for signaling messages
      channel.listen('.signaling', (event) => {
        this.emit('message', [{ topic, data: event.data }])
      })

      // Also support whisper for peer-to-peer messages
      channel.listenForWhisper('signaling', (event) => {
        this.emit('message', [{ topic, data: event }])
      })

      this.channels.set(topic, channel)
    })
  }

  /**
   * @param {Array<string>} topics
   */
  unsubscribe (topics) {
    topics.forEach(topic => {
      const channel = this.channels.get(topic)
      if (channel) {
        this.echo.leave(this._getChannelName(topic))
        this.channels.delete(topic)
        this.readyChannels.delete(topic)
        this.messageQueue.delete(topic)
      }
    })
  }

  /**
   * @param {string} topic
   * @param {any} data
   */
  publish (topic, data) {
    const channel = this.channels.get(topic)
    if (!channel) return

    // Only whisper if the channel subscription is ready
    if (this.readyChannels.has(topic)) {
      channel.whisper('signaling', data)
    } else {
      // Queue the message until subscription is ready
      if (!this.messageQueue.has(topic)) {
        this.messageQueue.set(topic, [])
      }
      this.messageQueue.get(topic).push(data)
    }
  }

  destroy () {
    this.disconnect()
    super.destroy()
  }
}
