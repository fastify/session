'use strict'

const crypto = require('crypto')

const Cookie = require('./cookie')
const cookieSignature = require('cookie-signature')
const { configure: configureStringifier } = require('safe-stable-stringify')

const stringify = configureStringifier({ bigint: false })

const secretKey = Symbol('secretKey')
const generateId = Symbol('generateId')
const requestKey = Symbol('request')
const cookieOptsKey = Symbol('cookieOpts')
const originalHash = Symbol('originalHash')
const hash = Symbol('hash')
const sessionIdKey = Symbol('sessionId')
const encryptedSessionIdKey = Symbol('encryptedSessionId')

module.exports = class Session {
  constructor (request, idGenerator, cookieOpts, secret, prevSession = {}, sessionId = idGenerator(request)) {
    // Copy over values from the previous session
    for (const key in prevSession) {
      this[key] = prevSession[key]
    }

    this[requestKey] = request
    this[generateId] = idGenerator
    this[cookieOptsKey] = cookieOpts
    this[secretKey] = secret

    this.cookie = new Cookie(cookieOpts)
    this[sessionIdKey] = sessionId
    this[encryptedSessionIdKey] = cookieSignature.sign(sessionId, secret)
    this[originalHash] = this[hash]()
  }

  touch () {
    if (this[cookieOptsKey].maxAge) {
      this.cookie.expires = new Date(Date.now() + this[cookieOptsKey].maxAge)
    }
  }

  regenerate (callback) {
    if (callback) {
      const session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[secretKey])

      this[requestKey].sessionStore.set(session.sessionId, session, error => {
        this[requestKey].session = session

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        const session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[secretKey])

        this[requestKey].sessionStore.set(session.sessionId, session, error => {
          this[requestKey].session = session

          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    }
  }

  get (key) {
    return this[key]
  }

  set (key, value) {
    this[key] = value
  }

  destroy (callback) {
    if (callback) {
      this[requestKey].sessionStore.destroy(this[sessionIdKey], error => {
        this[requestKey].session = null

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[requestKey].sessionStore.destroy(this[sessionIdKey], error => {
          this[requestKey].session = null

          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    }
  }

  reload (callback) {
    if (callback) {
      this[requestKey].sessionStore.get(this[sessionIdKey], (error, session) => {
        this[requestKey].session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[secretKey], session, this[sessionIdKey])

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[requestKey].sessionStore.get(this[sessionIdKey], (error, session) => {
          this[requestKey].session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[secretKey], session, this[sessionIdKey])

          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    }
  }

  save (callback) {
    if (callback) {
      this[requestKey].sessionStore.set(this[sessionIdKey], this, error => {
        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[requestKey].sessionStore.set(this[sessionIdKey], this, error => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    }
  }

  get sessionId() {
    return this[sessionIdKey]
  }

  get encryptedSessionId() {
    return this[encryptedSessionIdKey]
  }

  [hash] () {
    const sess = this
    const str = stringify(sess, function (key, val) {
      // ignore sess.cookie property
      if (this === sess && key === 'cookie') {
        return
      }

      return val
    })

    return crypto
      .createHash('sha1')
      .update(str, 'utf8')
      .digest('hex')
  }

  isModified () {
    return this[originalHash] !== this[hash]()
  }

  static restore (request, idGenerator, cookieOpts, secret, prevSession, sessionId) {
    const restoredSession = new Session(request, idGenerator, cookieOpts, secret, prevSession, sessionId)
    const restoredCookie = new Cookie(cookieOpts)
    if (prevSession.cookie.expires) {
      // Need to parse as Date
      restoredCookie.expires = new Date(prevSession.cookie.expires)
    }
    restoredSession.cookie = restoredCookie
    restoredSession[originalHash] = restoredSession[hash]()
    return restoredSession
  }
}
