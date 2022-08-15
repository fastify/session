'use strict'

const fp = require('fastify-plugin')
const uid = require('uid-safe').sync
const Store = require('./store')
const Session = require('./session')

function session (fastify, options, next) {
  options = ensureDefaults(options)

  // Decorator function takes cookieOpts so we can customize on per-session basis.
  // Note: method is deprecated, avoid using unless you need this functionality.
  fastify.decorate('decryptSession', (sessionId, request, cookieOpts, callback) => {
    if (typeof cookieOpts === 'function') {
      callback = cookieOpts
      cookieOpts = {}
    }

    const cookie = { ...options.cookie, ...cookieOpts }
    decryptSession(sessionId, { ...options, cookie }, request, callback)
  })
  fastify.decorateRequest('sessionStore', { getter: () => options.store })
  fastify.decorateRequest('session', null)
  fastify.addHook('onRequest', onRequest(options))
  fastify.addHook('onSend', onSend(options))
  next()

  function decryptSession (sessionId, options, request, done) {
    const cookieOpts = options.cookie
    const idGenerator = options.idGenerator

    const unsignedCookie = fastify.unsignCookie(sessionId)
    if (unsignedCookie.valid === false) {
      newSession(request, cookieOpts, idGenerator, done)
      return
    }
    const decryptedSessionId = unsignedCookie.value
    options.store.get(decryptedSessionId, (err, session) => {
      if (err) {
        if (err.code === 'ENOENT') {
          newSession(request, cookieOpts, idGenerator, done)
        } else {
          done(err)
        }
        return
      }
      if (!session) {
        newSession(request, cookieOpts, idGenerator, done)
        return
      }
      if (session.cookie?.expires && session.cookie.expires <= Date.now()) {
        const restoredSession = Session.restore(
          fastify,
          request,
          idGenerator,
          cookieOpts,
          session
        )

        restoredSession.destroy(err => {
          if (err) {
            done(err)
            return
          }

          restoredSession.regenerate(done)
        })
        return
      }
      if (options.rolling) {
        request.session = new Session(
          fastify,
          request,
          idGenerator,
          cookieOpts,
          session
        )
      } else {
        request.session = Session.restore(
          fastify,
          request,
          idGenerator,
          cookieOpts,
          session
        )
      }
      done()
    })
  }

  function onRequest (options) {
    const cookieOpts = options.cookie
    const idGenerator = options.idGenerator
    return function handleSession (request, reply, done) {
      request.session = {}

      const url = request.raw.url
      if (url.indexOf(cookieOpts.path || '/') !== 0) {
        done()
        return
      }
      const sessionId = request.cookies[options.cookieName]
      if (!sessionId) {
        newSession(request, cookieOpts, idGenerator, done)
      } else {
        decryptSession(sessionId, options, request, done)
      }
    }
  }

  function onSend (options) {
    return function saveSession (request, reply, payload, done) {
      const session = request.session
      if (!session || !session.sessionId) {
        done()
        return
      }

      if (!shouldSaveSession(request, options.cookie, options.saveUninitialized)) {
        // if a session cookie is set, but has a different ID, clear it
        if (request.cookies[options.cookieName] && request.cookies[options.cookieName] !== session.encryptedSessionId) {
          reply.clearCookie(options.cookieName)
        }
        done()
        return
      }
      session.save((err) => {
        if (err) {
          done(err)
          return
        }
        reply.setCookie(
          options.cookieName,
          session.encryptedSessionId,
          session.cookie.options(isConnectionSecure(request))
        )
        done()
      })
    }
  }

  function newSession (request, cookieOpts, idGenerator, done) {
    request.session = new Session(fastify, request, idGenerator, cookieOpts)
    done()
  }

  function idGenerator () {
    return uid(24)
  }

  function ensureDefaults (options) {
    options.store = options.store || new Store()
    options.idGenerator = options.idGenerator || idGenerator
    options.cookieName = options.cookieName || 'sessionId'
    options.unsignSignedCookie = options.unsignSignedCookie || false
    options.cookie = options.cookie || {}
    options.cookie.secure = option(options.cookie, 'secure', true)
    options.rolling = option(options, 'rolling', true)
    options.saveUninitialized = option(options, 'saveUninitialized', true)
    return options
  }

  function isConnectionSecure (request) {
    return (
      request.raw.socket?.encrypted === true ||
      request.headers['x-forwarded-proto'] === 'https'
    )
  }

  function shouldSaveSession (request, cookieOpts, saveUninitialized) {
    if (!saveUninitialized && !request.session.isModified()) {
      return false
    }
    if (cookieOpts.secure !== true || cookieOpts.secure === 'auto') {
      return true
    }
    return isConnectionSecure(request)
  }

  function option (options, key, def) {
    return options[key] === undefined ? def : options[key]
  }
}

module.exports = fp(session, {
  fastify: '4.x',
  name: '@fastify/session',
  dependencies: [
    '@fastify/cookie'
  ]
})

module.exports.Store = Store
module.exports.MemoryStore = Store
