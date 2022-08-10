'use strict'

const test = require('tap').test
const fastifyPlugin = require('fastify-plugin')
const { DEFAULT_OPTIONS, DEFAULT_COOKIE, buildFastify } = require('./util')

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
  t.plan(4)
  const options = {
    secret: ['geheim', 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk']
  }

  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('aYb4uTIhdBXCfk_ylik4QN6-u26K0u0e', {
        test: {}
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const fastify = await buildFastify(handler, options, plugin)
  t.teardown(() => fastify.close())

  const sessionIdEncryptedWithOldSecret = 'aYb4uTIhdBXCfk_ylik4QN6-u26K0u0e.eiVu2YbrcqbTUYTYaANks%2Fjn%2Bjta7QgpsxLO%2BOLN%2F4U'
  const sessionIdEncryptedWithNewSecret = 'aYb4uTIhdBXCfk_ylik4QN6-u26K0u0e.InCp31AuDa7DX%2F8rGBz8RMFiCpmUtjcF%2BS7Aco7tur8'

  const responseForOldSecret = await fastify.inject({
    url: '/',
    headers: {
      'x-forwarded-proto': 'https',
      cookie: `sessionId=${sessionIdEncryptedWithOldSecret}; Path=/; HttpOnly; Secure`
    }
  })
  t.equal(responseForOldSecret.statusCode, 200)
  // It will be replaced with the new secret!
  t.equal(responseForOldSecret.headers['set-cookie'].includes(sessionIdEncryptedWithNewSecret), true)

  const responseForNewSecret = await fastify.inject({
    url: '/',
    headers: {
      'x-forwarded-proto': 'https',
      cookie: `sessionId=${sessionIdEncryptedWithNewSecret}; Path=/; HttpOnly; Secure`
    }
  })
  t.equal(responseForNewSecret.statusCode, 200)
  t.equal(responseForNewSecret.headers['set-cookie'].includes(sessionIdEncryptedWithNewSecret), true)
})

test('should set session cookie using the specified cookie name', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
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
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
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
  t.match(response.headers['set-cookie'], /sessionId=.*\..*; Path=\/; HttpOnly; Secure/)
})

test('should create new session on expired session', async (t) => {
  t.plan(2)
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        sessionId: 'Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN',
        cookie: { expires: new Date(Date.now() - 1000), secure: true, httpOnly: true, path: '/' }
      }, done)
    })
  })
  function handler (request, reply) {
    reply.send(200)
  }
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
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
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { maxAge: 42 }
  }
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        test: {}
      }, done)
    })
  })
  function handler (request, reply) {
    t.ok(request.session.cookie.expires)
    reply.send(200)
  }
  const fastify = await buildFastify(handler, options, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: DEFAULT_COOKIE, 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  // Should be sending cookie as well
  t.match(response.headers['set-cookie'], /sessionId=.*\..*; Path=\/; Expires=.*; HttpOnly; Secure/)
})

test('should set new session cookie if expired', async (t) => {
  t.plan(3)

  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        cookie: { expires: new Date(Date.now() - 1000) }
      }, done)
    })
  })
  function handler (request, reply) {
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

  t.equal(response.headers['set-cookie'].includes('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE'), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
  t.equal(response.statusCode, 200)
})

test('should return new session cookie if does not exist in store', async (t) => {
  t.plan(3)
  const options = { secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk' }
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
  t.equal(response.headers['set-cookie'].includes('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE'), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should not set session cookie on invalid path', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
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
  const options = { secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk' }
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        test: {}
      }, done)
    })
  })
  const fastify = await buildFastify(handler, options, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: {
      cookie: 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.ohnoinvalidnooooL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure',
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'].includes('B7fUDYXx9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE'), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should not set session cookie if saveUninitialized is false and no data in session', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
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

test('should not set session cookie if saveUninitialized is false and data in session is unmodified', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    saveUninitialized: false
  }
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        test: {}
      }, done)
    })
  })
  const fastify = await buildFastify((request, reply) => reply.send(200), options, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.ok(response.headers['set-cookie'] === undefined)
})

test('should set session cookie if saveUninitialized is false and maxAge is on', async (t) => {
  t.plan(2)
  const options = {
    cookie: {
      maxAge: 42
    },
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    saveUninitialized: false
  }
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        // In this scenario, maxAge would have set expires in a previous request
        expires: new Date(Date.now() + 1000)
      }, done)
    })
  })
  const fastify = await buildFastify((request, reply) => reply.send(200), options, plugin)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.ok(response.headers['set-cookie'])
})
