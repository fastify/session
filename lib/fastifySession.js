'use strict'

const fp = require('fastify-plugin')
const uid = require('uid-safe').sync
const Store = require('./store')
const Session = require('./session')
const cookieSignature = require('cookie-signature')

function session (fastify, options, next) {
  const error = checkOptions(options)
  if (error) {
    return next(error)
  }

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
}

function decryptSession (sessionId, options, request, done) {
  const cookieOpts = options.cookie
  const idGenerator = options.idGenerator
  const secrets = options.secret
  const secretsLength = secrets.length
  const secret = secrets[0]

  let decryptedSessionId = false
  for (let i = 0; i < secretsLength; ++i) {
    decryptedSessionId = cookieSignature.unsign(sessionId, secrets[i])
    if (decryptedSessionId !== false) {
      break
    }
  }
  if (decryptedSessionId === false) {
    newSession(secret, request, cookieOpts, idGenerator, done)
  } else {
    options.store.get(decryptedSessionId, (err, session) => {
      if (err) {
        if (err.code === 'ENOENT') {
          newSession(secret, request, cookieOpts, idGenerator, done)
        } else {
          done(err)
        }
        return
      }
      if (!session) {
        newSession(secret, request, cookieOpts, idGenerator, done)
        return
      }
      if (session.cookie?.expires && session.cookie.expires <= Date.now()) {
        const restoredSession = Session.restore(
          request,
          idGenerator,
          cookieOpts,
          secret,
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
          request,
          idGenerator,
          cookieOpts,
          secret,
          session
        )
      } else {
        request.session = Session.restore(
          request,
          idGenerator,
          cookieOpts,
          secret,
          session
        )
      }
      done()
    })
  }
}

function onRequest (options) {
  const unsignSignedCookie = options.unsignSignedCookie
  const cookieOpts = options.cookie
  const cookieName = options.cookieName
  const idGenerator = options.idGenerator
  const cookiePrefix = options.cookiePrefix
  const hasCookiePrefix = typeof cookiePrefix === 'string' && cookiePrefix.length !== 0
  const cookiePrefixLength = hasCookiePrefix && cookiePrefix.length

  return function handleSession (request, reply, done) {
    request.session = {}

    const url = request.raw.url
    if (url.indexOf(cookieOpts.path || '/') !== 0) {
      done()
      return
    }
    let sessionId = request.cookies[cookieName]
    if (sessionId && hasCookiePrefix && sessionId.startsWith(cookiePrefix)) {
      sessionId = sessionId.slice(cookiePrefixLength)
    }
    const secret = options.secret[0]
    if (!sessionId) {
      newSession(secret, request, cookieOpts, idGenerator, done)
    } else {
      let sessionToDecrypt = sessionId

      if (unsignSignedCookie) {
        const unsignedCookie = reply.unsignCookie(sessionId)
        if (unsignedCookie.valid) {
          sessionToDecrypt = unsignedCookie.value
        }
      }

      decryptSession(sessionToDecrypt, options, request, done)
    }
  }
}

function onSend (options) {
  const cookieOpts = options.cookie
  const cookieName = options.cookieName
  const cookiePrefix = options.cookiePrefix
  const saveUninitialized = options.saveUninitialized
  const hasCookiePrefix = typeof cookiePrefix === 'string' && cookiePrefix.length !== 0

  return function saveSession (request, reply, payload, done) {
    const session = request.session
    if (!session || !session.sessionId) {
      done()
      return
    }

    let encryptedSessionId = session.encryptedSessionId
    if (encryptedSessionId && hasCookiePrefix) {
      encryptedSessionId = `${cookiePrefix}${encryptedSessionId}`
    }

    if (!shouldSaveSession(request, cookieOpts, saveUninitialized)) {
      // if a session cookie is set, but has a different ID, clear it
      if (request.cookies[cookieName] && request.cookies[cookieName] !== encryptedSessionId) {
        reply.clearCookie(cookieName)
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
        encryptedSessionId,
        session.cookie.options(isConnectionSecure(request))
      )
      done()
    })
  }
}

function newSession (secret, request, cookieOpts, idGenerator, done) {
  request.session = new Session(request, idGenerator, cookieOpts, secret)
  done()
}

function checkOptions (options) {
  if (!options.secret) {
    return new Error('the secret option is required!')
  }
  if (typeof options.secret === 'string' && options.secret.length < 32) {
    return new Error('the secret must have length 32 or greater')
  }
  if (Array.isArray(options.secret) && options.secret.length === 0) {
    return new Error('at least one secret is required')
  }
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
  options.secret = Array.isArray(options.secret) ? options.secret : [options.secret]
  options.cookiePrefix = option(options, 'cookiePrefix', '')
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

module.exports = fp(session, {
  fastify: '4.x',
  name: '@fastify/session',
  dependencies: [
    '@fastify/cookie'
  ]
})

module.exports.Store = Store
module.exports.MemoryStore = Store
