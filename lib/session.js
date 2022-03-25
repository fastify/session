'use strict'

const Cookie = require('./cookie')
const cookieSignature = require('cookie-signature')

const maxAge = Symbol('maxAge')
const secretKey = Symbol('secretKey')
const sign = Symbol('sign')
const addDataToSession = Symbol('addDataToSession')
const generateId = Symbol('generateId')
const requestKey = Symbol('request')
const cookieOptsKey = Symbol('cookieOpts')

module.exports = class Session {
  constructor (request, idGenerator, cookieOpts, secret, prevSession = {}) {
    this[generateId] = idGenerator
    this.expires = null
    this.cookie = new Cookie(cookieOpts)
    this[cookieOptsKey] = cookieOpts
    this[maxAge] = cookieOpts.maxAge
    this[secretKey] = secret
    this[addDataToSession](prevSession)
    this[requestKey] = request
    this.touch()
    if (!this.sessionId) {
      this.sessionId = this[generateId](this[requestKey])
      this.encryptedSessionId = this[sign]()
    }
  }

  touch () {
    if (this[maxAge]) {
      this.expires = new Date(Date.now() + this[maxAge])
      this.cookie.expires = this.expires
    }
  }

  regenerate (callback) {
    const session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[secretKey])

    this[requestKey].sessionStore.set(session.sessionId, session, error => {
      this[requestKey].session = session

      callback(error)
    })
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

  destroy (callback) {
    this[requestKey].sessionStore.destroy(this.sessionId, error => {
      this[requestKey].session = null

      callback(error)
    })
  }

  reload (callback) {
    this[requestKey].sessionStore.get(this.sessionId, (error, session) => {
      this[requestKey].session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[secretKey], session)

      callback(error)
    })
  }

  save (callback) {
    this[requestKey].sessionStore.set(this.sessionId, this, error => {
      callback(error)
    })
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
