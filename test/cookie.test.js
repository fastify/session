'use strict'

const test = require('tap').test
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('../lib/fastifySession')
const { DEFAULT_OPTIONS, DEFAULT_SECRET, buildFastify } = require('./util')

test('should set session cookie', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.socket.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should not set session cookie is request is not secure', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.socket.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'], undefined)
})

test('should not set session cookie is request is not secure and x-forwarded-proto != https', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.socket.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'http' }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'], undefined)
})

test('should set session cookie is request is not secure and x-forwarded-proto = https', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
    request.raw.socket.encrypted = false
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, DEFAULT_OPTIONS)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.ok(response.headers['set-cookie'])
})

test('session.cookie should have expires if maxage is set', async (t) => {
  t.plan(3)
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { maxAge: 100000000, secure: false }
  }
  const fastify = await buildFastify((request, reply) => {
    t.equal(request.session.cookie.maxAge, 100000000)
    reply.send(200)
  }, options)
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.ok(response.headers['set-cookie'].includes('Expires='))
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Expires=[\w, :]{29}; HttpOnly; Secure/)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Domain=localhost; Path=\/; HttpOnly; Secure/)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure; SameSite=Strict/)
})

test('should set session another path in cookie', async (t) => {
  t.plan(2)
  const fastify = Fastify()

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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/a/test/path',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[[\w-%]{43,57}; Path=\/a\/test\/path; HttpOnly; Secure/)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Expires=Mon, 01 Feb 1971 00:01:01 GMT; HttpOnly; Secure/)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Secure/)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly/)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly/)
})

test('should set session cookie secureAuto', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; SameSite=Lax/)
})

test('should set session cookie secureAuto change SameSite', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; SameSite=Lax/)
})

test('should set session cookie secureAuto keep SameSite when secured', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure; SameSite=None/)
})

test('should set session secure cookie secureAuto http encrypted', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.addHook('onRequest', async (request, reply) => {
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(response.statusCode, 200)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
})

test('should use maxAge instead of expires in session if both are set in options.cookie', async (t) => {
  t.plan(3)
  const expires = new Date()
  expires.setTime(34214461000) // 1971-02-01T00:01:01.000Z
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { maxAge: 1000, expires }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.code(200).send(Date.now().toString())
  }, options)
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  const dateFromBody = new Date(Number(response.body))
  t.equal(response.statusCode, 200)
  // Expires attribute should be determined by options.maxAge -> Date.now() + 1000 and should have the same year from response.body,
  // and not determined by options.expires and should not have the year of 1971
  t.notMatch(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Expires=\w+, \d+ \w+ 1971 \d{2}:\d{2}:\d{2} GMT; HttpOnly; Secure/)
  t.match(response.headers['set-cookie'], new RegExp(String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; Expires=\w+, \d+ \w+ ${dateFromBody.getFullYear()} \d{2}:\d{2}:\d{2} GMT; HttpOnly; Secure`))
})
