'use strict'

const test = require('node:test')
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('../lib/fastifySession')
const fastifyPlugin = require('fastify-plugin')
const Cookie = require('../lib/cookie')
const { DEFAULT_OPTIONS, DEFAULT_COOKIE, DEFAULT_SECRET, buildFastify, DEFAULT_SESSION_ID } = require('./util')

test('should set session cookie', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should not set session cookie is request is not secure', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (_request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.headers['set-cookie'], undefined)
})

test('should not set session cookie is request is not secure and x-forwarded-proto != https', async (t) => {
  t.plan(2)
  const fastify = Fastify({ trustProxy: true })
  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (_request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'http' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.headers['set-cookie'], undefined)
})

test('should set session cookie is request is not secure and x-forwarded-proto = https', async (t) => {
  t.plan(2)
  const fastify = Fastify({ trustProxy: true })
  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.ok(response.headers['set-cookie'])
})

test('session.cookie should have expires if maxAge is set', async (t) => {
  t.plan(3)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { maxAge: 100000000, secure: false }
  }
  const fastify = await buildFastify((request, reply) => {
    t.assert.strictEqual(request.session.cookie.originalMaxAge, 100000000)
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.ok(response.headers['set-cookie'].includes('Expires='))
})

test('should set session cookie with expires if maxAge', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { maxAge: 42 }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Expires=[\w, :]{29}; HttpOnly; Secure`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session cookie with maxAge', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { domain: 'localhost' }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Domain=localhost; Path=\/; HttpOnly; Secure`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session cookie with sameSite', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { sameSite: true }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure; SameSite=Strict`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session another path in cookie', async (t) => {
  t.plan(2)
  const fastify = Fastify({ trustProxy: true })

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { path: '/a/test/path' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/a/test/path', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/a/test/path',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[[\w-%]{43,57}; Path=\/a\/test\/path; HttpOnly; Secure`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session cookie with expires', async (t) => {
  t.plan(2)
  const date = new Date()
  date.setTime(34214461000)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { expires: date }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Expires=Mon, 01 Feb 1971 00:01:01 GMT; HttpOnly; Secure`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session non HttpOnly cookie', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { httpOnly: false }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Secure`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session non secure cookie', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session non secure cookie secureAuto', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: 'auto' }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session cookie secureAuto', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: DEFAULT_SECRET,
    cookie: { secure: 'auto' }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    authority: 'fastify-session.test',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; SameSite=Lax`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session cookie secureAuto change SameSite', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: DEFAULT_SECRET,
    cookie: { secure: 'auto', sameSite: 'none' }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    authority: 'fastify-session.test',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; SameSite=Lax`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session cookie secureAuto keep SameSite when secured', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: DEFAULT_SECRET,
    cookie: { secure: 'auto', sameSite: 'none' }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure; SameSite=None`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session secure cookie secureAuto http encrypted', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: DEFAULT_SECRET,
    cookie: { secure: 'auto' }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session secure cookie secureAuto x-forwarded-proto header', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: 'auto' }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should set session partitioned cookie secure http encrypted', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: DEFAULT_SECRET,
    cookie: { secure: 'true', partitioned: true }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure; Partitioned`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('should use maxAge instead of expires in session if both are set in options.cookie', async (t) => {
  t.plan(3)
  const expires = new Date(34214461000) // 1971-02-01T00:01:01.000Z
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { maxAge: 1000, expires }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.code(200).send(Date.now().toString())
  }, options)
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  const dateFromBody = new Date(Number(response.body))
  t.assert.strictEqual(response.statusCode, 200)
  // Expires attribute should be determined by options.maxAge -> Date.now() + 1000 and should have the same year from response.body,
  // and not determined by options.expires and should not have the year of 1971
  const pattern1 = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Expires=\w+, \d+ \w+ 1971 \d{2}:\d{2}:\d{2} GMT; HttpOnly; Secure/`
  t.assert.strictEqual(new RegExp(pattern1).exec(response.headers['set-cookie']), null)
  const pattern2 = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Expires=\w+, \d+ \w+ ${dateFromBody.getFullYear()} \d{2}:\d{2}:\d{2} GMT; HttpOnly; Secure`
  t.assert.strictEqual(new RegExp(pattern2).test(response.headers['set-cookie']), true)
})

test('should use session.cookie.originalMaxAge instead of the default maxAge', async (t) => {
  t.plan(2)

  const originalMaxAge = 1000
  const maxAge = 2000

  const DateNow = Date.now
  const now = Date.now()
  Date.now = () => now

  const plugin = fastifyPlugin(async (fastify) => {
    fastify.addHook('onRequest', (request, _reply, done) => {
      request.sessionStore.set(DEFAULT_SESSION_ID, {
        cookie: {
          originalMaxAge,
          expires: new Date(now + originalMaxAge)
        }
      }, done)
    })
  })

  const fastify = await buildFastify((_request, reply) => {
    reply.send(200)
  }, { secret: DEFAULT_SECRET, cookie: { maxAge } }, plugin)
  t.after(() => {
    fastify.close()
    Date.now = DateNow
  })

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: DEFAULT_COOKIE, 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  const pattern = String.raw`sessionId=.*; Path=/; Expires=${new Date(now + originalMaxAge).toUTCString()}; HttpOnly`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('when cookie secure is set to false then store secure as false', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(fastifyCookie)

  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    saveUninitialized: true,
    cookie: { secure: false },
    rolling: true
  })

  fastify.get('/', (request, reply) => {
    t.assert.strictEqual(request.session.cookie.secure, false)
    reply.send(200)
  })

  const response = await fastify.inject({ path: '/' })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(typeof response.headers['set-cookie'], 'string')
  const pattern = String.raw`^sessionId=[\w-]{32}.[\w-%]{43,135}; Path=\/; HttpOnly$`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['set-cookie']), true)
})

test('Cookie', async t => {
  t.plan(4)

  const cookie = new Cookie({})

  await t.test('properties', t => {
    t.plan(10)

    t.assert.strictEqual('expires' in cookie, true)
    t.assert.strictEqual('originalMaxAge' in cookie, true)
    t.assert.strictEqual('sameSite' in cookie, true)
    t.assert.strictEqual('secure' in cookie, true)
    t.assert.strictEqual('path' in cookie, true)
    t.assert.strictEqual('httpOnly' in cookie, true)
    t.assert.strictEqual('domain' in cookie, true)
    t.assert.strictEqual('_expires' in cookie, true)
    t.assert.strictEqual('maxAge' in cookie, true)
    t.assert.strictEqual('partitioned' in cookie, true)
  })

  await t.test('toJSON', t => {
    t.plan(10)

    const json = cookie.toJSON()

    t.assert.strictEqual('expires' in json, true)
    t.assert.strictEqual('originalMaxAge' in json, true)
    t.assert.strictEqual('sameSite' in json, true)
    t.assert.strictEqual('secure' in json, true)
    t.assert.strictEqual('path' in json, true)
    t.assert.strictEqual('httpOnly' in json, true)
    t.assert.strictEqual('domain' in json, true)
    t.assert.strictEqual('partitioned' in json, true)

    t.assert.strictEqual('_expires' in json, false)
    t.assert.strictEqual('maxAge' in json, false)
  })

  // the clock ticks while we're testing, so to prevent occasional test
  // failures where these tests tick over 1ms, take the time difference into
  // account:

  await t.test('maxAge calculated from expires', t => {
    t.plan(2)

    const startT = Date.now()
    const cookie = new Cookie({ expires: new Date(Date.now() + 1000) })
    const maxAge = cookie.maxAge
    const duration = Date.now() - startT

    t.assert.strictEqual(maxAge <= 1000 && maxAge >= 1000 - duration, true)
    t.assert.strictEqual(cookie.originalMaxAge, null)
  })

  await t.test('maxAge set by maxAge', t => {
    t.plan(2)

    const startT = Date.now()
    const cookie = new Cookie({ maxAge: 1000 })
    const maxAge = cookie.maxAge
    const duration = Date.now() - startT

    t.assert.strictEqual(maxAge <= 1000 && maxAge >= 1000 - duration, true)
    t.assert.strictEqual(cookie.originalMaxAge, 1000)
  })
})
