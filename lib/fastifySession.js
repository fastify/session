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

  fastify.decorate('decryptSession', (sessionId, request, callback) => {
    decryptSession(sessionId, options, request, callback)
  })
  fastify.decorateRequest('sessionStore', options.store)
  fastify.decorateRequest('session', {})
  fastify.decorateRequest('destroySession', destroySession)
  fastify.addHook('preValidation', preValidation(options))
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
        options.store.destroy(sessionId, getDestroyCallback(secret, request, done, cookieOpts, idGenerator))
        return
      }
      request.session = new Session(
        idGenerator,
        cookieOpts,
        secret,
        session
      )
      done()
    })
  }
}

function preValidation (options) {
  const cookieOpts = options.cookie
  const idGenerator = options.idGenerator
  return function handleSession (request, reply, done) {
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
      decryptSession(sessionId, options, request, done)
    }
  }
}

function onSend (options) {
  return function saveSession (request, reply, payload, done) {
    const session = request.session
    if (!session || !session.sessionId || !shouldSaveSession(request, options.cookie, options.saveUninitialized)) {
      done()
      return
    }
    options.store.set(session.sessionId, session, (err) => {
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

function getDestroyCallback (secret, request, done, cookieOpts, idGenerator) {
  return function destroyCallback (err) {
    if (err) {
      done(err)
      return
    }
    newSession(secret, request, cookieOpts, idGenerator, done)
  }
}

function newSession (secret, request, cookieOpts, idGenerator, done) {
  request.session = new Session(idGenerator, cookieOpts, secret)
  done()
}

function destroySession (done) {
  const request = this
  request.sessionStore.destroy(request.session.sessionId, (err) => {
    request.session = null
    done(err)
  })
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
  options.cookie = options.cookie || {}
  options.cookie.secure = option(options.cookie, 'secure', true)
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
  if (!saveUninitialized && !isSessionModified(request.session)) {
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

function isSessionModified (session) {
  return (Object.keys(session).length !== 4)
}

function option (options, key, def) {
  return options[key] === undefined ? def : options[key]
}

exports = module.exports = fastifyPlugin(session, metadata)
module.exports.Store = Store
module.exports.MemoryStore = Store
