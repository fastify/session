'use strict'

const Cookie = require('./cookie')

const maxAge = Symbol('maxAge')

module.exports = class Session {
  constructor (sessionId, encryptedSessionId, cookieOpts) {
    this.sessionId = sessionId
    this.encryptedSessionId = encryptedSessionId
    this.expires = null
    this.cookie = new Cookie(cookieOpts)
    this[maxAge] = cookieOpts.maxAge
    this.touch()
  }

  touch () {
    if (this[maxAge]) {
      this.expires = new Date(Date.now() + this[maxAge])
      this.cookie.expires = this.expires
    }
  }
}
