/**
 * @module signaling-adapters/reverbWireFormat
 *
 * Laravel Reverb's `ClientEvent` validator rejects whispers whose `data` field
 * is not an array (or JSON-decodable to one) with `pusher:error 4200 "Invalid
 * message format"`. When y-webrtc encrypts signaling payloads (room password
 * set), it produces a base64 string, which fails that validator.
 *
 * To stay compatible with Reverb without disabling encryption, the Laravel
 * Echo adapters wrap string payloads as `{ d: '<string>' }` on the wire and
 * unwrap them back to the original string on receive. Object payloads (the
 * unencrypted case) pass through unchanged.
 *
 * @see https://github.com/laravel/reverb/blob/main/src/Protocols/Pusher/ClientEvent.php
 */

const WIRE_STRING_KEY = 'd'

/**
 * @param {any} data
 * @returns {any}
 */
export const wrapForWire = (data) => {
  if (typeof data === 'string') {
    return { [WIRE_STRING_KEY]: data }
  }
  return data
}

/**
 * @param {any} data
 * @returns {any}
 */
export const unwrapFromWire = (data) => {
  if (
    data !== null &&
    typeof data === 'object' &&
    typeof data[WIRE_STRING_KEY] === 'string' &&
    Object.keys(data).length === 1
  ) {
    return data[WIRE_STRING_KEY]
  }
  return data
}
