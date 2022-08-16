'use strict'

const test = require('tap').test
const Signer = require('@fastify/cookie').Signer
const fastifyPlugin = require('fastify-plugin')
const { DEFAULT_OPTIONS, DEFAULT_COOKIE, DEFAULT_SESSION_ID, DEFAULT_SECRET, DEFAULT_ENCRYPTED_SESSION_ID, buildFastify } = require('./util')

test('should not set session cookie on post without params', async (t) => {
  t.plan(3)
  const fastify = await buildFastify((request, reply) => reply.send(200), DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    method: 'POST',
    url: '/test',
    headers: { 'content-type': 'application/json' }
  })
  t.equal(response.statusCode, 400)
  t.ok(response.body.includes('FST_ERR_CTP_EMPTY_JSON_BODY'))
  t.same(response.headers['set-cookie'], undefined)
})

test('should set session cookie', async (t) => {
  t.plan(4)
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response1 = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response1.statusCode, 200)
  t.match(response1.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)

  const response2 = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response2.statusCode, 200)
  t.match(response2.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should support multiple secrets', async (t) => {
  t.plan(2)
  const options = {
    secret: ['geheim', DEFAULT_SECRET]
  }

  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('aYb4uTIhdBXCfk_ylik4QN6-u26K0u0e', {
        expires: Date.now() + 1000
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const fastify = await buildFastify(handler, options, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      'x-forwarded-proto': 'https',
      cookie: 'sessionId=aYb4uTIhdBXCfk_ylik4QN6-u26K0u0e.eiVu2YbrcqbTUYTYaANks%2Fjn%2Bjta7QgpsxLO%2BOLN%2F4U; Path=/; HttpOnly; Secure'
    }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'].includes('aYb4uTIhdBXCfk_ylik4QN6-u26K0u0e'), false)
})

test('should set session cookie using the specified cookie name', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookieName: 'anothername'
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /anothername=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should set session cookie using the default cookie name', async (t) => {
  t.plan(2)
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set(DEFAULT_SESSION_ID, {
        expires: Date.now() + 1000,
        sessionId: DEFAULT_SESSION_ID,
        cookie: { secure: true, httpOnly: true, path: '/' }
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const fastify = await buildFastify(handler, DEFAULT_OPTIONS, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=undefined; Path=\/; HttpOnly; Secure/)
})

test('should set express sessions using the specified cookiePrefix', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookieName: 'connect.sid',
    cookiePrefix: 's:'
  }

  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        expires: Date.now() + 1000
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const fastify = await buildFastify(handler, options, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: 'connect.sid=s%3AQk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure',
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /connect.sid=s%3A[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should create new session on expired session', async (t) => {
  t.plan(2)
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set(DEFAULT_SESSION_ID, {
        sessionId: DEFAULT_SESSION_ID,
        cookie: { secure: true, httpOnly: true, path: '/', expires: Date.now() - 1000 }
      }, done)
    })
  })
  function handler (request, reply) {
    reply.send(200)
  }
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { maxAge: 100 }
  }
  const fastify = await buildFastify(handler, options, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=.*\..*; Path=\/; Expires=.*; HttpOnly; Secure/)
})

test('should set session.cookie.expires if maxAge', async (t) => {
  t.plan(3)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { maxAge: 42 }
  }
  function handler (request, reply) {
    t.ok(request.session.cookie.expires)
    reply.send(200)
  }
  const fastify = await buildFastify(handler, options)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: DEFAULT_COOKIE, 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=.*\..*; Path=\/; Expires=.*; HttpOnly; Secure/)
})

test('should set new session cookie if expired', async (t) => {
  t.plan(3)

  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set(DEFAULT_SESSION_ID, {
        cookie: {
          expires: Date.now() + 1000
        }
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const fastify = await buildFastify(handler, DEFAULT_OPTIONS, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.headers['set-cookie'].includes(DEFAULT_ENCRYPTED_SESSION_ID), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
  t.equal(response.statusCode, 200)
})

test('should return new session cookie if does not exist in store', async (t) => {
  t.plan(3)
  const options = { secret: DEFAULT_SECRET }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'].includes(DEFAULT_ENCRYPTED_SESSION_ID), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should not set session cookie on invalid path', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { path: '/path/' }
  }
  const fastify = await buildFastify((request, reply) => reply.send(200), options)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.ok(response.headers['set-cookie'] === undefined)
})

test('should create new session if cookie contains invalid session', async (t) => {
  t.plan(3)
  const options = { secret: DEFAULT_SECRET }
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set(DEFAULT_SESSION_ID, {
        test: {}
      }, done)
    })
  })
  const fastify = await buildFastify(handler, options, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: `sessionId=${DEFAULT_SECRET}.badinvalidsignaturenoooo; Path=/; HttpOnly; Secure`,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'].includes('badinvalidsignaturenoooo'), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should not set session cookie if no data in session and saveUninitialized is false', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    saveUninitialized: false
  }
  const fastify = await buildFastify((request, reply) => reply.send(200), options)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.ok(response.headers['set-cookie'] === undefined)
})

test('should handle algorithm sha256', async (t) => {
  t.plan(3)
  const options = { secret: DEFAULT_SECRET, algorithm: 'sha256' }
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, options)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'].includes(DEFAULT_ENCRYPTED_SESSION_ID), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should handle algorithm sha512', async (t) => {
  t.plan(3)
  const options = { secret: DEFAULT_SECRET, algorithm: 'sha512' }
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, options)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'].includes(DEFAULT_ENCRYPTED_SESSION_ID), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,135}; Path=\/; HttpOnly; Secure/)
})

test('should handle custom signer', async (t) => {
  const signer = new Signer(DEFAULT_SECRET, 'sha512')
  t.plan(3)
  const options = { secret: signer }
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, options)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'].includes(DEFAULT_ENCRYPTED_SESSION_ID), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,135}; Path=\/; HttpOnly; Secure/)
})
