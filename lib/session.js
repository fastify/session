'use strict'

const Cookie = require('./cookie')
const cookieSignature = require('cookie-signature')

const maxAge = Symbol('maxAge')
const secretKey = Symbol('secretKey')
const sign = Symbol('sign')
const addDataToSession = Symbol('addDataToSession')
const generateId = Symbol('generateId')

module.exports = class Session {
  constructor (idGenerator, cookieOpts, secret, prevSession = {}) {
    this[generateId] = idGenerator
    this.expires = null
    this.cookie = new Cookie(cookieOpts)
    this[maxAge] = cookieOpts.maxAge
    this[secretKey] = secret
    this[addDataToSession](prevSession)
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
    this.sessionId = this[generateId]()
    this.encryptedSessionId = this[sign]()
  }

  [addDataToSession] (prevSession) {
    for (const key in prevSession) {
      if (!['expires', 'cookie'].includes(key)) {
        this[key] = prevSession[key]
      }
    }
  }

  [sign] () {
    return cookieSignature.sign(this.sessionId, this[secretKey])
  }
}
