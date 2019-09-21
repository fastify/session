'use strict'

const { test } = require('tap')
const fastifyPlugin = require('fastify-plugin')
const { testServer, request, DEFAULT_OPTIONS, DEFAULT_COOKIE } = require('./util')

test('should set session cookie on post without params', async (t) => {
  t.plan(1)
  const port = await testServer((request, reply) => reply.send(200), DEFAULT_OPTIONS)

  const { statusCode } = await request({
    method: 'POST',
    uri: `http://localhost:${port}/test`,
    headers: { 'content-type': 'application/json' }
  })
  t.strictEqual(statusCode, 400)
})

test('should set session cookie', async (t) => {
  t.plan(4)
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { statusCode: statusCode1, cookie: cookie1 } = await request({
    uri: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.strictEqual(statusCode1, 200)
  t.match(cookie1, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)

  const { statusCode: statusCode2, cookie: cookie2 } = await request({
    uri: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.strictEqual(statusCode2, 200)
  t.match(cookie2, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})

test('should set session cookie using the specified cookie name', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookieName: 'anothername'
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    uri: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.strictEqual(statusCode, 200)
  t.match(cookie, /anothername=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})

test('should set session cookie using the default cookie name', async (t) => {
  t.plan(2)
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('preValidation', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        isExpired () {
          return false
        },
        sessionId: 'Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN',
        cookie: { secure: true, httpOnly: true, path: '/' }
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const port = await testServer(handler, DEFAULT_OPTIONS, plugin)

  const { statusCode, cookie } = await request({
    uri: `http://localhost:${port}`,
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.strictEqual(statusCode, 200)
  t.match(cookie, /sessionId=undefined; Path=\/; HttpOnly; Secure/)
})

test('should set session.expires if maxAge', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { maxAge: 42 }
  }
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('preValidation', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        isExpired () {
          return false
        }
      }, done)
    })
  })
  function handler (request, reply) {
    t.ok(request.session.expires)
    reply.send(200)
  }
  const port = await testServer(handler, options, plugin)

  const { statusCode } = await request({
    uri: `http://localhost:${port}`,
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.strictEqual(statusCode, 200)
})

test('should set new session cookie if expired', async (t) => {
  t.plan(3)

  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('preValidation', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        isExpired () {
          return true
        }
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const port = await testServer(handler, DEFAULT_OPTIONS, plugin)

  const { statusCode, cookie } = await request({
    uri: `http://localhost:${port}`,
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.strictEqual(statusCode, 200)
  t.notOk(cookie.includes('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE'))
  t.match(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})

test('should return new session cookie if does not exist in store', async (t) => {
  t.plan(3)
  const options = { secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk' }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    uri: `http://localhost:${port}`,
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.strictEqual(statusCode, 200)
  t.notOk(cookie.includes('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE'))
  t.match(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})

test('should not set session cookie on invalid path', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { path: '/path/' }
  }
  const port = await testServer((request, reply) => reply.send(200), options)

  const { response } = await request({
    uri: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.strictEqual(response.statusCode, 200)
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
    fastify.addHook('preValidation', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        isExpired () {
          return false
        }
      }, done)
    })
  })
  const port = await testServer(handler, options, plugin)

  const { statusCode, cookie } = await request({
    uri: `http://localhost:${port}`,
    headers: {
      cookie: 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXx9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure',
      'x-forwarded-proto': 'https'
    }
  })

  t.strictEqual(statusCode, 200)
  t.ok(!cookie.includes('B7fUDYXx9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE'))
  t.match(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})

test('should not set session cookie if no data in session and saveUninitialized is false', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    saveUninitialized: false
  }
  const port = await testServer((request, reply) => reply.send(200), options)

  const { response } = await request({
    uri: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.strictEqual(response.statusCode, 200)
  t.ok(response.headers['set-cookie'] === undefined)
})
