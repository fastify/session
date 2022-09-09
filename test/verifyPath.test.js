'use strict'

const test = require('tap').test
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('..')
const { DEFAULT_SECRET } = require('./util')

test('should handle path properly /1', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.equal(request.session.foo, 'bar')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should handle path properly /2', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.equal(request.session.foo, 'bar')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should handle path properly /2', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check/page1', (request, reply) => {
    t.equal(request.session.foo, 'bar')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should handle path properly /3', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check_page1', (request, reply) => {
    t.same(request.session.foo, null)
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check_page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should handle path properly /4', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/chick/page1', (request, reply) => {
    t.same(request.session.foo, null)
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/chick/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should handle path properly /5', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/chck', (request, reply) => {
    t.same(request.session.foo, null)
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/chck',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should handle path properly /5', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.post('/check/index', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check/page1', (request, reply) => {
    t.same(request.session.foo, 'bar')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/check/index',
    method: 'POST'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should handle path properly /6', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check/' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.post('/check/index', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check/page1', (request, reply) => {
    t.same(request.session.foo, 'bar')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/check/index',
    method: 'POST'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})
