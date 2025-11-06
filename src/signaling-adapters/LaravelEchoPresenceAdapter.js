/**
 * @module signaling-adapters/LaravelEchoPresenceAdapter
 */

import { SignalingAdapter } from './SignalingAdapter.js'

/**
 * @typedef {Object} PresenceChannelMember
 * @property {number|string} id - User ID
 * @property {any} info - User information
 */

/**
 * @typedef {Object} PresenceCallbacks
 * @property {(members: PresenceChannelMember[]) => void} [onHere] - Called when subscription succeeds with list of all members
 * @property {(member: PresenceChannelMember) => void} [onJoining] - Called when a new member joins the channel
 * @property {(member: PresenceChannelMember) => void} [onLeaving] - Called when a member leaves the channel
 * @property {(error: any, channelName: string) => void} [onError] - Called when there's an error subscribing to a channel
 * @property {(channelName: string) => void} [onSubscribed] - Called when successfully subscribed to a channel
 */

/**
 * Laravel Echo Presence Channel adapter for signaling.
 * This adapter uses Laravel Echo's presence channels, which provide information
 * about who is subscribed to the channel.
 *
 * @extends SignalingAdapter
 */
export class LaravelEchoPresenceAdapter extends SignalingAdapter {
  /**
   * @param {any} echoInstance - Laravel Echo instance
   * @param {PresenceCallbacks} [callbacks] - Optional callbacks for presence events
   */
  constructor (echoInstance, callbacks = {}) {
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
    /**
     * @type {Map<string, PresenceChannelMember[]>}
     */
    this.presenceMembers = new Map()
    /**
     * @type {PresenceCallbacks}
     */
    this.callbacks = {
      onHere: callbacks.onHere || null,
      onJoining: callbacks.onJoining || null,
      onLeaving: callbacks.onLeaving || null,
      onError: callbacks.onError || null,
      onSubscribed: callbacks.onSubscribed || null
    }
  }

  /**
   * Set callback for when the initial member list is received
   * @param {(members: PresenceChannelMember[]) => void} callback
   * @returns {LaravelEchoPresenceAdapter} Returns this for chaining
   */
  onHere (callback) {
    this.callbacks.onHere = callback
    return this
  }

  /**
   * Set callback for when a new member joins
   * @param {(member: PresenceChannelMember) => void} callback
   * @returns {LaravelEchoPresenceAdapter} Returns this for chaining
   */
  onJoining (callback) {
    this.callbacks.onJoining = callback
    return this
  }

  /**
   * Set callback for when a member leaves
   * @param {(member: PresenceChannelMember) => void} callback
   * @returns {LaravelEchoPresenceAdapter} Returns this for chaining
   */
  onLeaving (callback) {
    this.callbacks.onLeaving = callback
    return this
  }

  /**
   * Set callback for subscription errors
   * @param {(error: any, channelName: string) => void} callback
   * @returns {LaravelEchoPresenceAdapter} Returns this for chaining
   */
  onError (callback) {
    this.callbacks.onError = callback
    return this
  }

  /**
   * Set callback for successful subscriptions
   * @param {(channelName: string) => void} callback
   * @returns {LaravelEchoPresenceAdapter} Returns this for chaining
   */
  onSubscribed (callback) {
    this.callbacks.onSubscribed = callback
    return this
  }

  /**
   * Get the current members of a topic's presence channel
   * @param {string} topic
   * @returns {PresenceChannelMember[]}
   */
  getPresenceMembers (topic) {
    return this.presenceMembers.get(topic) || []
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
    this.presenceMembers.clear()
    this.emit('disconnect', [])
  }

  /**
   * Get the channel name for a topic
   * @param {string} topic
   * @returns {string}
   */
  _getChannelName (topic) {
    // Use presence channel for y-webrtc rooms
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
      const channel = this.echo.join(channelName) // Use join() for presence channels

      // Handle the initial member list
      channel.here((members) => {
        this.presenceMembers.set(topic, members)
        if (this.callbacks.onHere) {
          this.callbacks.onHere(members)
        }
      })

      // Handle new members joining
      channel.joining((member) => {
        const members = this.presenceMembers.get(topic) || []
        members.push(member)
        this.presenceMembers.set(topic, members)
        if (this.callbacks.onJoining) {
          this.callbacks.onJoining(member)
        }
      })

      // Handle members leaving
      channel.leaving((member) => {
        const members = this.presenceMembers.get(topic) || []
        const filtered = members.filter(m => m.id !== member.id)
        this.presenceMembers.set(topic, filtered)
        if (this.callbacks.onLeaving) {
          this.callbacks.onLeaving(member)
        }
      })

      // Wait for subscription to be ready before allowing whispers
      channel.subscribed(() => {
        this.readyChannels.add(topic)

        if (this.callbacks.onSubscribed) {
          this.callbacks.onSubscribed(channelName)
        }

        // Flush any queued messages
        const queuedMessages = this.messageQueue.get(topic) || []
        queuedMessages.forEach(data => {
          channel.whisper('signaling', data)
        })
        this.messageQueue.delete(topic)
      })

      // Handle subscription errors
      channel.error((error) => {
        console.error(`LaravelEchoPresenceAdapter: Error subscribing to ${channelName}:`, error)
        if (this.callbacks.onError) {
          this.callbacks.onError(error, channelName)
        }
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
        this.presenceMembers.delete(topic)
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
