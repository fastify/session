'use strict'

const Cookie = require('./cookie')

module.exports = class Session {
  constructor (sessionId, encryptedSessionId, expires, cookieOpts) {
    this.sessionId = sessionId
    this.encryptedSessionId = encryptedSessionId
    this.expires = expires
    this.cookie = new Cookie(cookieOpts)
  }
}
