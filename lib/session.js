'use strict'

const Cookie = require('./cookie')
const generateSessionIds = require('./utils')
const maxAge = Symbol('maxAge')

module.exports = class Session {
  constructor (sessionId, encryptedSessionId, cookieOpts, secret, prevSession = {}) {
    this.sessionId = sessionId
    this.encryptedSessionId = encryptedSessionId
    this.expires = null
    this.cookie = new Cookie(cookieOpts)
    this[maxAge] = cookieOpts.maxAge
    this.secret = secret
    this.addUserDataToSession(prevSession)
    this.touch()
  }

  touch () {
    if (this[maxAge]) {
      this.expires = new Date(Date.now() + this[maxAge])
      this.cookie.expires = this.expires
    }
  }

  addUserDataToSession (prevSession) {
    const keys = Object.keys(prevSession).filter((key) => !['sessionId', 'encryptedSessionId', 'expires', 'cookie'].includes(key))
    keys.forEach((key) => {
      this[key] = prevSession[key]
    })
  }

  regenerate () {
    const sessionIds = generateSessionIds(this.secret)
    this.sessionId = sessionIds.sessionId
    this.encryptedSessionId = sessionIds.encryptedSessionId
  }
}
