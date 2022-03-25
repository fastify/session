'use strict'

const Cookie = require('./cookie')
const cookieSignature = require('cookie-signature')

const maxAge = Symbol('maxAge')
const secretKey = Symbol('secretKey')
const sign = Symbol('sign')
const addDataToSession = Symbol('addDataToSession')
const generateId = Symbol('generateId')
const requestKey = Symbol('request')

module.exports = class Session {
  constructor (request, idGenerator, cookieOpts, secret, prevSession = {}) {
    this[generateId] = idGenerator
    this.expires = null
    this.cookie = new Cookie(cookieOpts)
    this[maxAge] = cookieOpts.maxAge
    this[secretKey] = secret
    this[addDataToSession](prevSession)
    this[requestKey] = request
    this.touch()
    if (!this.sessionId) {
      this.regenerate()
    }
  }

  touch () {
    if (this[maxAge]) {
      this.expires = new Date(Date.now() + this[maxAge])
      this.cookie.expires = this.expires
    }
  }

  regenerate () {
    this.sessionId = this[generateId](this[requestKey])
    this.encryptedSessionId = this[sign]()
  }

  [addDataToSession] (prevSession) {
    for (const key in prevSession) {
      if (!['expires', 'cookie'].includes(key)) {
        this[key] = prevSession[key]
      }
    }
  }

  get (key) {
    return this[key]
  }

  set (key, value) {
    this[key] = value
  }

  [sign] () {
    return cookieSignature.sign(this.sessionId, this[secretKey])
  }

  static restore (request, idGenerator, cookieOpts, secret, prevSession) {
    const restoredSession = new Session(request, idGenerator, cookieOpts, secret, prevSession)
    const restoredCookie = new Cookie(cookieOpts)
    restoredCookie.expires = new Date(prevSession.cookie.expires)
    restoredSession.cookie = restoredCookie
    restoredSession.expires = restoredCookie.expires
    return restoredSession
  }
}
