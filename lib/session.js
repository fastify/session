'use strict'

const crypto = require('crypto')

const Cookie = require('./cookie')
const { configure: configureStringifier } = require('safe-stable-stringify')

const stringify = configureStringifier({ bigint: false })

const fastifyKey = Symbol('fastify')
const maxAge = Symbol('maxAge')
const addDataToSession = Symbol('addDataToSession')
const generateId = Symbol('generateId')
const requestKey = Symbol('request')
const cookieOptsKey = Symbol('cookieOpts')
const originalHash = Symbol('originalHash')
const hash = Symbol('hash')

module.exports = class Session {
  constructor (fastify, request, idGenerator, cookieOpts, prevSession = {}) {
    this[fastifyKey] = fastify
    this[generateId] = idGenerator
    this.cookie = new Cookie(cookieOpts)
    this[cookieOptsKey] = cookieOpts
    this[maxAge] = cookieOpts.maxAge
    this[addDataToSession](prevSession)
    this[requestKey] = request
    this.touch()
    if (!this.sessionId) {
      this.sessionId = this[generateId](this[requestKey])
      this.encryptedSessionId = fastify.signCookie(this.sessionId)
    }
    this[originalHash] = this[hash]()
  }

  touch () {
    if (this[maxAge]) {
      this.cookie.expires = new Date(Date.now() + this[maxAge])
    }
  }

  regenerate (callback) {
    if (callback) {
      const session = new Session(this[fastifyKey], this[requestKey], this[generateId], this[cookieOptsKey])

      this[requestKey].sessionStore.set(session.sessionId, session, error => {
        this[requestKey].session = session

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        const session = new Session(this[fastifyKey], this[requestKey], this[generateId], this[cookieOptsKey])

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

  [addDataToSession] (prevSession) {
    for (const key in prevSession) {
      if (key !== 'cookie') {
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
    if (callback) {
      this[requestKey].sessionStore.destroy(this.sessionId, error => {
        this[requestKey].session = null

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[requestKey].sessionStore.destroy(this.sessionId, error => {
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
      this[requestKey].sessionStore.get(this.sessionId, (error, session) => {
        this[requestKey].session = new Session(this[fastifyKey], this[requestKey], this[generateId], this[cookieOptsKey], session)

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[requestKey].sessionStore.get(this.sessionId, (error, session) => {
          this[requestKey].session = new Session(this[fastifyKey], this[requestKey], this[generateId], this[cookieOptsKey], session)

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
      this[requestKey].sessionStore.set(this.sessionId, this, error => {
        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[requestKey].sessionStore.set(this.sessionId, this, error => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    }
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

  static restore (fastify, request, idGenerator, cookieOpts, prevSession) {
    const restoredSession = new Session(fastify, request, idGenerator, cookieOpts, prevSession)
    const restoredCookie = new Cookie(cookieOpts)
    restoredCookie.expires = new Date(prevSession.cookie.expires)
    restoredSession.cookie = restoredCookie
    restoredSession[originalHash] = restoredSession[hash]()
    return restoredSession
  }
}
