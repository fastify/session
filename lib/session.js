'use strict'

const crypto = require('crypto')

const Cookie = require('./cookie')
const { configure: configureStringifier } = require('safe-stable-stringify')

const stringify = configureStringifier({ bigint: false })

const maxAge = Symbol('maxAge')
const cookieSignerKey = Symbol('cookieSignerKey')
const generateId = Symbol('generateId')
const requestKey = Symbol('request')
const cookieOptsKey = Symbol('cookieOpts')
const originalHash = Symbol('originalHash')
const hash = Symbol('hash')

module.exports = class Session {
  constructor (request, idGenerator, cookieOpts, cookieSigner, prevSession) {
    this[generateId] = idGenerator
    this[cookieOptsKey] = cookieOpts
    this[maxAge] = cookieOpts.maxAge
    this[cookieSignerKey] = cookieSigner
    this[requestKey] = request
    this.cookie = new Cookie((prevSession && prevSession.cookie) || cookieOpts)

    if (prevSession) {
      // Copy over values from the previous session
      for (const key in prevSession) {
        (key !== 'cookie') && (this[key] = prevSession[key])
      }
    }

    this.touch()
    if (!this.sessionId) {
      this.sessionId = this[generateId](this[requestKey])
      this.encryptedSessionId = cookieSigner.sign(this.sessionId)
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
      const session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[cookieSignerKey])

      this[requestKey].sessionStore.set(session.sessionId, session, error => {
        this[requestKey].session = session

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        const session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[cookieSignerKey])

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
        this[requestKey].session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[cookieSignerKey], session)

        callback(error)
      })
    } else {
      return new Promise((resolve, reject) => {
        this[requestKey].sessionStore.get(this.sessionId, (error, session) => {
          this[requestKey].session = new Session(this[requestKey], this[generateId], this[cookieOptsKey], this[cookieSignerKey], session)

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
}
