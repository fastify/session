'use strict'

const randomBytes = require('node:crypto').randomBytes

const cacheSize = 24 << 7
let pos = 0
let cache = randomBytes(cacheSize)

const EQUAL_END_REGEXP = /=/g
const PLUS_GLOBAL_REGEXP = /\+/g
const SLASH_GLOBAL_REGEXP = /\//g

module.exports = function (useBase64Url = Buffer.isEncoding('base64url')) {
  return useBase64Url
    ? function idGenerator () {
      if ((pos + 24) > cacheSize) {
        cache = randomBytes(cacheSize)
        pos = 0
      }
      const buf = Buffer.allocUnsafe(24)
      cache.copy(buf, 0, pos, (pos += 24))
      return buf.toString('base64url')
    }
    : function idGenerator () {
      if ((pos + 24) > cacheSize) {
        cache = randomBytes(cacheSize)
        pos = 0
      }
      const buf = Buffer.allocUnsafe(24)
      cache.copy(buf, 0, pos, (pos += 24))
      return buf.toString('base64')
        .replace(EQUAL_END_REGEXP, '')
        .replace(PLUS_GLOBAL_REGEXP, '-')
        .replace(SLASH_GLOBAL_REGEXP, '_')
    }
}
