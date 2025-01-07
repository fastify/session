'use strict'

const fp = require('fastify-plugin')
const idGenerator = require('./idGenerator')()
const Store = require('./store')
const Session = require('./session')

function fastifySession (fastify, options, next) {
  const error = checkOptions(options)
  if (error) {
    return next(error)
  }

  options = ensureDefaults(options)

  const sessionStore = options.store
  const cookieSigner = options.signer
  const cookieName = options.cookieName
  const cookiePrefix = options.cookiePrefix
  const hasCookiePrefix = typeof cookiePrefix === 'string' && cookiePrefix.length !== 0
  const cookiePrefixLength = hasCookiePrefix && cookiePrefix.length

  // Decorator function takes cookieOpts so we can customize on per-session basis.
  fastify.decorate('decryptSession', (sessionId, request, cookieOpts, callback) => {
    if (typeof cookieOpts === 'function') {
      callback = cookieOpts
      cookieOpts = {}
    }

    const cookie = { ...options.cookie, ...cookieOpts }
    decryptSession(sessionId, { ...options, cookie }, request, callback)
  })
  fastify.decorateRequest('sessionStore', { getter: () => sessionStore })
  fastify.decorateRequest('session', null)
  fastify.addHook('onRequest', onRequest(options))
  fastify.addHook('onSend', onSend(options))
  next()

  function decryptSession (sessionId, options, request, done) {
    const cookieOpts = options.cookie
    const idGenerator = options.idGenerator

    const unsignedCookie = cookieSigner.unsign(sessionId)
    if (unsignedCookie.valid === false) {
      request.session = new Session(
        sessionStore,
        request,
        idGenerator,
        cookieOpts,
        cookieSigner
      )
      done()
      return
    }
    const decryptedSessionId = unsignedCookie.value
    sessionStore.get(decryptedSessionId, (err, session) => {
      if (err) {
        if (err.code === 'ENOENT') {
          request.session = new Session(
            sessionStore,
            request,
            idGenerator,
            cookieOpts,
            cookieSigner
          )
          done()
        } else {
          done(err)
        }
        return
      }

      if (!session) {
        request.session = new Session(
          sessionStore,
          request,
          idGenerator,
          cookieOpts,
          cookieSigner
        )
        done()
        return
      }

      const restoredSession = new Session(
        sessionStore,
        request,
        idGenerator,
        cookieOpts,
        cookieSigner,
        session,
        decryptedSessionId
      )

      const expiration = restoredSession.cookie.originalExpires || restoredSession.cookie.expires

      if (expiration && expiration.getTime() <= Date.now()) {
        restoredSession.destroy(err => {
          if (err) {
            done(err)
            return
          }

          restoredSession.regenerate(done)
        })
        return
      }

      request.session = restoredSession
      done()
    })
  }

  const getCookieSessionId = hasCookiePrefix
    ? function getCookieSessionId (request) {
      const cookieValue = request.cookies[cookieName]
      return (
        cookieValue?.startsWith(cookiePrefix) &&
        cookieValue.slice(cookiePrefixLength)
      )
    }
    : function getCookieSessionId (request) {
      return request.cookies[cookieName]
    }

  function onRequest (options) {
    const cookieOpts = options.cookie
    const idGenerator = options.idGenerator

    return function handleSession (request, _reply, done) {
      request.session = {}

      const url = request.raw.url.split('?', 1)[0]
      if (verifyPath(url, cookieOpts.path || '/') === false) {
        done()
        return
      }

      const cookieSessionId = getCookieSessionId(request)
      if (!cookieSessionId) {
        request.session = new Session(
          sessionStore,
          request,
          idGenerator,
          cookieOpts,
          cookieSigner
        )
        done()
      } else {
        decryptSession(cookieSessionId, options, request, done)
      }
    }
  }

  function onSend (options) {
    const cookieOpts = options.cookie
    const saveUninitializedSession = options.saveUninitialized
    const rollingSessions = options.rolling

    return function saveSession (request, reply, _payload, done) {
      const session = request.session
      if (!session || !session.sessionId || !session.encryptedSessionId) {
        done()
        return
      }

      const cookieSessionId = getCookieSessionId(request)
      const saveSession = shouldSaveSession(request, cookieSessionId, saveUninitializedSession, rollingSessions)
      const isInsecureConnection = cookieOpts.secure === true && request.protocol !== 'https'
      const sessionIdWithPrefix = hasCookiePrefix ? `${cookiePrefix}${session.encryptedSessionId}` : session.encryptedSessionId
      if (!saveSession || isInsecureConnection) {
        // if a session cookie is set, but has a different ID, clear it
        if (cookieSessionId && cookieSessionId !== session.encryptedSessionId) {
          reply.clearCookie(cookieName, { domain: cookieOpts.domain })
        }

        if (session.isSaved()) {
          reply.setCookie(
            cookieName,
            sessionIdWithPrefix,
            // we need to remove extra properties to align the same with `express-session`
            session.cookie.toJSON()
          )
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
          cookieName,
          sessionIdWithPrefix,
          // we need to remove extra properties to align the same with `express-session`
          session.cookie.toJSON()
        )
        done()
      })
    }
  }

  function checkOptions (options) {
    if (typeof options.secret === 'string') {
      if (options.secret.length < 32) {
        return new Error('the secret must have length 32 or greater')
      }
    } else if (Array.isArray(options.secret)) {
      if (options.secret.length === 0) {
        return new Error('at least one secret is required')
      }
    } else if (!(options.secret && typeof options.secret.sign === 'function' && typeof options.secret.unsign === 'function')) {
      return new Error('the secret option is required, and must be a String, Array of Strings, or a signer object with .sign and .unsign methods')
    }
  }

  function ensureDefaults (options) {
    const opts = {}
    opts.store = options.store || new Store()
    opts.idGenerator = options.idGenerator || idGenerator
    opts.cookieName = options.cookieName || 'sessionId'
    opts.cookie = options.cookie || {}
    opts.cookie.secure = option(opts.cookie, 'secure', true)
    opts.rolling = option(options, 'rolling', true)
    opts.saveUninitialized = option(options, 'saveUninitialized', true)
    opts.algorithm = options.algorithm || 'sha256'
    opts.signer = typeof options.secret === 'string' || Array.isArray(options.secret)
      ? new (require('@fastify/cookie').Signer)(options.secret, opts.algorithm)
      : options.secret
    opts.cookiePrefix = option(options, 'cookiePrefix', '')
    return opts
  }

  function shouldSaveSession (request, cookieId, saveUninitializedSession, rollingSessions) {
    return cookieId !== request.session.encryptedSessionId
      ? saveUninitializedSession || request.session.isModified()
      : rollingSessions || request.session.isModified()
  }

  function option (options, key, def) {
    return options[key] === undefined ? def : options[key]
  }

  function verifyPath (path, cookiePath) {
    if (path === cookiePath) {
      return true
    }
    const pathLength = path.length
    const cookiePathLength = cookiePath.length

    if (pathLength <= cookiePathLength) {
      return false
    } else if (path.startsWith(cookiePath)) {
      if (path[cookiePathLength] === '/') {
        return true
      } else if (cookiePath[cookiePathLength - 1] === '/') {
        return true
      }
    }
    return false
  }
}

module.exports = fp(fastifySession, {
  fastify: '5.x',
  name: '@fastify/session',
  dependencies: [
    '@fastify/cookie'
  ]
})
module.exports.default = fastifySession
module.exports.fastifySession = fastifySession

module.exports.Store = Store
module.exports.MemoryStore = Store
