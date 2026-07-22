'use strict'

const crypto = require('node:crypto')

const Cookie = require('./cookie')
const { configure: configureStringifier } = require('safe-stable-stringify')

const stringify = configureStringifier({ bigint: false })

const cookieSignerKey = Symbol('cookieSignerKey')
const generateId = Symbol('generateId')
const requestKey = Symbol('request')
const cookieOptsKey = Symbol('cookieOpts')
const persistedHash = Symbol('persistedHash')
const hash = Symbol('hash')
const sessionIdKey = Symbol('sessionId')
const sessionStoreKey = Symbol('sessionStore')
const encryptedSessionIdKey = Symbol('encryptedSessionId')
const savedKey = Symbol('saved')
const hookEmitterKey = Symbol('hookEmitter')

module.exports = class Session {
  constructor (
    sessionStore,
    request,
    idGenerator,
    cookieOpts,
    cookieSigner,
    {
      prevSession,
      sessionId = idGenerator(request),
      hookEmitter
    } = {}
  ) {
    const previousCookie = prevSession?.cookie && typeof prevSession.cookie.toJSON === 'function'
      ? prevSession.cookie.toJSON()
      : prevSession?.cookie

    const restoredCookieOpts = previousCookie
      ? { ...cookieOpts, ...previousCookie }
      : { ...cookieOpts }

    const sessionCookieOpts = { ...restoredCookieOpts }
    if (sessionCookieOpts.originalMaxAge != null) {
      sessionCookieOpts.maxAge = sessionCookieOpts.originalMaxAge
    }

    if (sessionCookieOpts.expires && sessionCookieOpts.originalMaxAge == null) {
      const expires = new Date(sessionCookieOpts.expires)
      if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
        delete sessionCookieOpts.expires
      }
    }

    delete sessionCookieOpts.originalMaxAge
    delete sessionCookieOpts.originalExpires

    this[sessionStoreKey] = sessionStore
    this[generateId] = idGenerator
    this[cookieOptsKey] = sessionCookieOpts
    this[cookieSignerKey] = cookieSigner
    this[requestKey] = request
    this[hookEmitterKey] = hookEmitter
    this[sessionIdKey] = sessionId
    this[encryptedSessionIdKey] = (
      prevSession &&
      prevSession[sessionIdKey] === sessionId &&
      prevSession[encryptedSessionIdKey]
    ) || cookieSigner.sign(this.sessionId)
    this[savedKey] = false
    this.cookie = new Cookie(restoredCookieOpts, request)

    if (prevSession) {
      // Copy over values from the previous session
      for (const key in prevSession) {
        (
          key !== 'cookie' &&
          key !== 'sessionId' &&
          key !== 'encryptedSessionId'
        ) && (this[key] = prevSession[key])
      }
    }

    this[persistedHash] = this[hash]()
  }

  options (opts) {
    if (Object.keys(opts).length) {
      this[cookieOptsKey] = { ...this[cookieOptsKey], ...opts }
      this.cookie = new Cookie(this[cookieOptsKey], this[requestKey])
    }
  }

  touch () {
    if (this.cookie.originalMaxAge) {
      this.cookie.expires = new Date(Date.now() + this.cookie.originalMaxAge)
    }
  }

  regenerate (keys, callback) {
    if (typeof keys === 'function') {
      callback = keys
      keys = undefined
    }
    const session = new Session(
      this[sessionStoreKey],
      this[requestKey],
      this[generateId],
      this[cookieOptsKey],
      this[cookieSignerKey],
      { hookEmitter: this[hookEmitterKey] }
    )

    if (Array.isArray(keys)) {
      for (const key of keys) {
        session.set(key, this[key])
      }
    }

    if (callback) {
      this[sessionStoreKey].set(session.sessionId, session, error => {
        this[requestKey].session = session

        if (!error) {
          this[hookEmitterKey]?.emit(
            'onRegenerate',
            [this[sessionIdKey], session.sessionId, this[requestKey]],
            { operation: 'regenerate', sessionId: this[sessionIdKey] },
            this[requestKey]
          )
        } else {
          this[hookEmitterKey]?.reportError(error, { operation: 'regenerate', sessionId: this[sessionIdKey] }, this[requestKey])
        }

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[sessionStoreKey].set(session.sessionId, session, error => {
          this[requestKey].session = session

          if (error) {
            this[hookEmitterKey]?.reportError(error, { operation: 'regenerate', sessionId: this[sessionIdKey] }, this[requestKey])
            reject(error)
          } else {
            this[hookEmitterKey]?.emit(
              'onRegenerate',
              [this[sessionIdKey], session.sessionId, this[requestKey]],
              { operation: 'regenerate', sessionId: this[sessionIdKey] },
              this[requestKey]
            )
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
      this[sessionStoreKey].destroy(this[sessionIdKey], error => {
        this[requestKey].session = null

        if (error) {
          this[hookEmitterKey]?.reportError(error, { operation: 'destroy', sessionId: this[sessionIdKey] }, this[requestKey])
        } else {
          this[hookEmitterKey]?.emit(
            'onDestroy',
            [this[sessionIdKey], this[requestKey]],
            { operation: 'destroy', sessionId: this[sessionIdKey] },
            this[requestKey]
          )
        }

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[sessionStoreKey].destroy(this[sessionIdKey], error => {
          this[requestKey].session = null

          if (error) {
            this[hookEmitterKey]?.reportError(error, { operation: 'destroy', sessionId: this[sessionIdKey] }, this[requestKey])
            reject(error)
          } else {
            this[hookEmitterKey]?.emit(
              'onDestroy',
              [this[sessionIdKey], this[requestKey]],
              { operation: 'destroy', sessionId: this[sessionIdKey] },
              this[requestKey]
            )
            resolve()
          }
        })
      })
    }
  }

  reload (callback) {
    if (callback) {
      this[sessionStoreKey].get(this[sessionIdKey], (error, session) => {
        this[requestKey].session = new Session(
          this[sessionStoreKey],
          this[requestKey],
          this[generateId],
          this[cookieOptsKey],
          this[cookieSignerKey],
          {
            prevSession: session,
            sessionId: this[sessionIdKey],
            hookEmitter: this[hookEmitterKey]
          }
        )

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[sessionStoreKey].get(this[sessionIdKey], (error, session) => {
          this[requestKey].session = new Session(
            this[sessionStoreKey],
            this[requestKey],
            this[generateId],
            this[cookieOptsKey],
            this[cookieSignerKey],
            {
              prevSession: session,
              sessionId: this[sessionIdKey],
              hookEmitter: this[hookEmitterKey]
            }
          )

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
      this[sessionStoreKey].set(this[sessionIdKey], this, error => {
        if (error) {
          this[hookEmitterKey]?.reportError(error, { operation: 'save', sessionId: this[sessionIdKey] }, this[requestKey])
          callback(error)
        } else {
          this[savedKey] = true
          this[persistedHash] = this[hash]()
          this[hookEmitterKey]?.emit(
            'onSave',
            [this, this[requestKey]],
            { operation: 'save', sessionId: this[sessionIdKey] },
            this[requestKey]
          )
          callback()
        }
      })
    } else {
      return new Promise((resolve, reject) => {
        this[sessionStoreKey].set(this[sessionIdKey], this, error => {
          if (error) {
            this[hookEmitterKey]?.reportError(error, { operation: 'save', sessionId: this[sessionIdKey] }, this[requestKey])
            reject(error)
          } else {
            this[savedKey] = true
            this[persistedHash] = this[hash]()
            this[hookEmitterKey]?.emit(
              'onSave',
              [this, this[requestKey]],
              { operation: 'save', sessionId: this[sessionIdKey] },
              this[requestKey]
            )
            resolve()
          }
        })
      })
    }
  }

  get sessionId () {
    return this[sessionIdKey]
  }

  get encryptedSessionId () {
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
      .createHash('sha256')
      .update(str, 'utf8')
      .digest('hex')
  }

  isModified () {
    return this[persistedHash] !== this[hash]()
  }

  isSaved () {
    return this[savedKey]
  }
}
