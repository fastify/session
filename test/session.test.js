'use strict'

const test = require('ava')
const Fastify = require('fastify')
const fastifyCookie = require('fastify-cookie')
const fastifySession = require('..')
const { request, testServer, DEFAULT_OPTIONS } = require('./util')
const Session = require('../lib/session')

test('should add session object to request', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { statusCode } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
})

test('should destroy the session', async (t) => {
  t.plan(3)
  const port = await testServer((request, reply) => {
    request.destroySession((err) => {
      t.falsy(err)
      t.is(request.session, null)
      reply.send(200)
    })
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should add session.encryptedSessionId object to request', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session.encryptedSessionId)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { statusCode } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
})

test('should add session.cookie object to request', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session.cookie)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { statusCode } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
})

test('should add session.expires object to request', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { maxAge: 42 }
  }
  const port = await testServer((request, reply) => {
    t.truthy(request.session.expires)
    reply.send(200)
  }, options)

  const { statusCode } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
})

test('should add session.sessionId object to request', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session.sessionId)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should keep user data in session throughout the time', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: false }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.true(request.session.foo === 'bar')
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { response: response1 } = await request({
    uri: 'http://localhost:' + fastify.server.address().port
  })

  t.is(response1.statusCode, 200)

  const { response: response2 } = await request({
    uri: 'http://localhost:' + fastify.server.address().port + '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.is(response2.statusCode, 200)
})

test('should generate new sessionId', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: false }
  }
  let oldSessionId
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    oldSessionId = request.session.sessionId
    request.session.regenerate()
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.not(request.session.sessionId, oldSessionId)
    reply.send(200)
  })
  await fastify.listen(0)
  fastify.server.unref()

  const { response: response1 } = await request({
    uri: 'http://localhost:' + fastify.server.address().port
  })

  t.is(response1.statusCode, 200)

  const { response: response2 } = await request({
    uri: 'http://localhost:' + fastify.server.address().port + '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.is(response2.statusCode, 200)
})

test('session should be expired if expires is set', (t) => {
  t.plan(1)
  const session = new Session({ expires: 1 }, 'test')

  t.false(session.isExpired())
})

test('session should be expired if maxAge is set', (t) => {
  t.plan(1)
  const session = new Session({ maxAge: 42 }, 'test')

  t.false(session.isExpired())
})
