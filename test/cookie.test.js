'use strict'

const test = require('ava')
const Fastify = require('fastify')
const fastifyCookie = require('fastify-cookie')
const fastifySession = require('../lib/fastifySession')
const { request, testServer, DEFAULT_OPTIONS } = require('./util')

test('should set session cookie', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.connection.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { statusCode, cookie } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})

test('should not set session cookie is request is not secure', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.connection.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => reply.send(200))
  await fastify.listen(0)
  fastify.server.unref()
  const port = fastify.server.address().port

  const { statusCode, cookie } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
  t.falsy(cookie)
})

test('should not set session cookie is request is not secure and x-forwarded-proto != https', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.connection.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => reply.send(200))
  await fastify.listen(0)
  fastify.server.unref()

  const { statusCode, cookie } = await request({
    url: 'http://localhost:' + fastify.server.address().port,
    headers: { 'x-forwarded-proto': 'http' }
  })

  t.is(statusCode, 200)
  t.falsy(cookie)
})

test('should set session cookie is request is not secure and x-forwarded-proto = https', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.connection.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { statusCode, cookie } = await request({
    url: 'http://localhost:' + fastify.server.address().port,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 200)
  t.truthy(cookie)
})

test('session.cookie should have maxage', async (t) => {
  t.plan(3)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { maxAge: 100000000, secure: false }
  }
  const port = await testServer((request, reply) => {
    t.is(request.session.cookie.maxAge, 100000000)
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
  t.truthy(cookie)
})

test('should set session cookie with expires if maxAge', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { maxAge: 42 }
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; Expires=[\w, :]{29}; HttpOnly; Secure/)
})

test('should set session cookie with maxAge', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { domain: 'localhost' }
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Domain=localhost; Path=\/; HttpOnly; Secure/)
})

test('should set session cookie with sameSite', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { sameSite: true }
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure; SameSite=Strict/)
})

test('should set session another path in cookie', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { path: '/a/test/path' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/a/test/path', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { statusCode, cookie } = await request({
    url: 'http://localhost:' + fastify.server.address().port + '/a/test/path',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[[\w-%]{43,55}; Path=\/a\/test\/path; HttpOnly; Secure/)
})

test('should set session cookie with expires', async (t) => {
  t.plan(2)
  const date = new Date()
  date.setTime(34214461000)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { expires: date }
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; Expires=Mon, 01 Feb 1971 00:01:01 GMT; HttpOnly; Secure/)
})

test('should set session non HttpOnly cookie', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { httpOnly: false }
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; Secure/)
})

test('should set session non secure cookie', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: false }
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly/)
})

test('should set session non secure cookie secureAuto', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: 'auto' }
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly/)
})

test('should set session cookie secureAuto', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.connection.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: 'auto' }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { statusCode, cookie } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; SameSite=Lax/)
})

test('should set session cookie secureAuto change SameSite', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.connection.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: 'auto', sameSite: 'none' }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { statusCode, cookie } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; SameSite=Lax/)
})

test('should set session cookie secureAuto keep SameSite when secured', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.connection.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: 'auto', sameSite: 'none' }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { statusCode, cookie } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure; SameSite=None/)
})

test('should set session secure cookie secureAuto http encrypted', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.connection.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: 'auto' }
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { statusCode, cookie } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})

test('should set session secure cookie secureAuto x-forwarded-proto header', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: 'auto' }
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 200)
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})
