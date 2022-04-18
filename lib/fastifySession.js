'use strict'

const uid = require('uid-safe').sync
const fastifyPlugin = require('fastify-plugin')
const Store = require('./store')
const Session = require('./session')
const metadata = require('./metadata')
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
      if (session && session.expires && session.expires <= Date.now()) {
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
  const idGenerator = options.idGenerator
  return function handleSession (request, reply, done) {
    request.session = {}

    const url = request.raw.url
    if (url.indexOf(cookieOpts.path || '/') !== 0) {
      done()
      return
    }
    const sessionId = request.cookies[options.cookieName]
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
  return options
}

function getRequestProto (request) {
  return request.headers['x-forwarded-proto'] || 'http'
}

function isConnectionSecure (request) {
  if (isConnectionEncrypted(request)) {
    return true
  }
  return getRequestProto(request) === 'https'
}

function isConnectionEncrypted (request) {
  const socket = request.raw.socket
  if (socket && socket.encrypted === true) {
    return true
  }
  return false
}

function shouldSaveSession (request, cookieOpts, saveUninitialized) {
  if (!saveUninitialized && !request.session.isModified()) {
    return false
  }
  if (cookieOpts.secure !== true || cookieOpts.secure === 'auto') {
    return true
  }
  if (isConnectionEncrypted(request)) {
    return true
  }
  const forwardedProto = getRequestProto(request)
  return forwardedProto === 'https'
}

function option (options, key, def) {
  return options[key] === undefined ? def : options[key]
}

exports = module.exports = fastifyPlugin(session, metadata)
module.exports.Store = Store
module.exports.MemoryStore = Store
