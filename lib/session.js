'use strict'

const Cookie = require('./cookie')

const maxAge = Symbol('maxAge')
const secretKey = Symbol('secretKey')
const addDataToSession = Symbol('addDataToSession')
const generateId = Symbol('generateId')

module.exports = class Session {
  constructor (request, idGenerator, cookieOpts, secret, prevSession = {}) {
    this[generateId] = idGenerator
    this.expires = null
    this.cookie = new Cookie(cookieOpts)
    this[maxAge] = cookieOpts.maxAge
    this[secretKey] = secret
    this[addDataToSession](prevSession)
    this.touch()
    if (!this.sessionId) {
      this.regenerate(request)
    }
  }

  touch () {
    if (this[maxAge]) {
      this.expires = new Date(Date.now() + this[maxAge])
      this.cookie.expires = this.expires
    }
  }

  regenerate (request) {
    this.sessionId = this[generateId](request)
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

  static restore (request, idGenerator, cookieOpts, secret, prevSession) {
    const restoredSession = new Session(request, idGenerator, cookieOpts, secret, prevSession)
    const restoredCookie = new Cookie(cookieOpts)
    restoredCookie.expires = new Date(prevSession.cookie.expires)
    restoredSession.cookie = restoredCookie
    restoredSession.expires = restoredCookie.expires
    return restoredSession
  }
}
