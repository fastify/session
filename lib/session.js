'use strict'

const crypto = require('node:crypto')

const Cookie = require('./cookie')
const { getSessionGeneration, metadataKey } = require('./sessionMetadata')
const { configure: configureStringifier } = require('safe-stable-stringify')

const stringify = configureStringifier({ bigint: false })

const cookieSignerKey = Symbol('cookieSignerKey')
const generateId = Symbol('generateId')
const requestKey = Symbol('request')
const cookieOptsKey = Symbol('cookieOpts')
const persistedHash = Symbol('persistedHash')
const hash = Symbol('hash')
const sessionIdKey = Symbol('sessionId')
const sessionStoreIdKey = Symbol('sessionStoreId')
const sessionStoreKey = Symbol('sessionStore')
const encryptedSessionIdKey = Symbol('encryptedSessionId')
const expectedGenerationKey = Symbol('expectedGeneration')
const persistedKey = Symbol('persisted')
const savedKey = Symbol('saved')
const destroyedKey = Symbol('destroyed')

class Session {
  constructor (
    sessionStore,
    request,
    idGenerator,
    cookieOpts,
    cookieSigner,
    prevSession,
    sessionId = idGenerator(request),
    sessionStoreId = sessionId,
    expectedGeneration
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
    this[sessionIdKey] = sessionId
    this[sessionStoreIdKey] = sessionStoreId
    this[encryptedSessionIdKey] = (
      prevSession &&
      prevSession[sessionIdKey] === sessionId &&
      prevSession[sessionStoreIdKey] === sessionStoreId &&
      prevSession[encryptedSessionIdKey]
    ) || cookieSigner.sign(encodeSessionId(sessionStoreId, sessionId))
    this[expectedGenerationKey] = expectedGeneration ?? (
      prevSession == null ? undefined : getSessionGeneration(prevSession, sessionStoreId)
    )
    this[persistedKey] = prevSession != null || expectedGeneration !== undefined
    this[savedKey] = false
    this[destroyedKey] = false
    this.cookie = new Cookie(restoredCookieOpts, request)
    Object.defineProperty(this, metadataKey, {
      enumerable: true,
      value: Object.freeze({ generation: sessionId })
    })

    if (prevSession) {
      // Copy over values from the previous session
      for (const key in prevSession) {
        (
          key !== 'cookie' &&
          key !== 'sessionId' &&
          key !== 'encryptedSessionId' &&
          key !== metadataKey
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
      undefined,
      this[generateId](this[requestKey]),
      this[sessionStoreIdKey],
      this[persistedKey] ? this[sessionIdKey] : undefined
    )

    if (Array.isArray(keys)) {
      for (const key of keys) {
        session.set(key, this[key])
      }
    }

    const regenerateSession = done => {
      session.save(error => {
        if (!error) {
          this[requestKey].session = session
        }
        done(error)
      })
    }

    if (callback) {
      regenerateSession(callback)
    } else {
      return new Promise((resolve, reject) => {
        regenerateSession(error => {
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
      this[sessionStoreKey].destroy(this[sessionStoreIdKey], error => {
        this[requestKey].session = null
        this[destroyedKey] = !error

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[sessionStoreKey].destroy(this[sessionStoreIdKey], error => {
          this[requestKey].session = null
          this[destroyedKey] = !error

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
    const reloadSession = done => {
      this[sessionStoreKey].get(this[sessionStoreIdKey], (error, session) => {
        if (error) {
          done(error)
          return
        }

        if (!session && this[persistedKey]) {
          const error = new Error('The session does not exist')
          error.code = 'ENOENT'
          done(error)
          return
        }

        if (session && getSessionGeneration(session, this[sessionStoreIdKey]) !== this[sessionIdKey]) {
          const error = new Error('The session has changed')
          error.code = 'ENOENT'
          done(error)
          return
        }

        this[requestKey].session = new Session(
          this[sessionStoreKey],
          this[requestKey],
          this[generateId],
          this[cookieOptsKey],
          this[cookieSignerKey],
          session,
          this[sessionIdKey],
          this[sessionStoreIdKey]
        )
        done(null)
      })
    }

    if (callback) {
      reloadSession(callback)
    } else {
      return new Promise((resolve, reject) => {
        reloadSession(error => {
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
    const saveSession = done => {
      if (this[destroyedKey]) {
        const error = new Error('The session was destroyed')
        error.code = 'ENOENT'
        done(error)
        return
      }

      const method = this[persistedKey] ? 'compareAndSet' : 'set'
      const args = this[persistedKey]
        ? [this[sessionStoreIdKey], this[expectedGenerationKey], this]
        : [this[sessionStoreIdKey], this]
      const persist = this[sessionStoreKey][method]

      persist.call(this[sessionStoreKey], ...args, error => {
        if (error) {
          done(error)
          return
        }

        this[expectedGenerationKey] = this[sessionIdKey]
        this[persistedKey] = true
        this[savedKey] = true
        this[persistedHash] = this[hash]()
        done()
      })
    }

    if (callback) {
      saveSession(callback)
    } else {
      return new Promise((resolve, reject) => {
        saveSession(error => {
          if (error) {
            reject(error)
          } else {
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

  get sessionStoreId () {
    return this[sessionStoreIdKey]
  }

  [hash] () {
    const sess = this
    const str = stringify(sess, function (key, val) {
      // ignore internal properties
      if (this === sess && (key === 'cookie' || key === metadataKey)) {
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

  isPersisted () {
    return this[persistedKey]
  }
}

const encodedSessionIdPrefix = '@fastify/session:v1.'

function encodeSessionId (sessionStoreId, sessionId) {
  const value = Buffer
    .from(JSON.stringify([sessionStoreId, sessionId]))
    .toString('base64url')
  return `${encodedSessionIdPrefix}${value}`
}

function decodeSessionId (value) {
  if (value.startsWith(encodedSessionIdPrefix)) {
    try {
      const decoded = JSON.parse(
        Buffer.from(value.slice(encodedSessionIdPrefix.length), 'base64url').toString()
      )
      if (
        Array.isArray(decoded) &&
        decoded.length === 2 &&
        typeof decoded[0] === 'string' &&
        typeof decoded[1] === 'string'
      ) {
        return { sessionStoreId: decoded[0], sessionId: decoded[1] }
      }
    } catch {}
  }

  return { sessionStoreId: value, sessionId: value }
}

Session.decodeSessionId = decodeSessionId
module.exports = Session
