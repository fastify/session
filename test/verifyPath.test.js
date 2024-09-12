'use strict'

const test = require('node:test')
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
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.assert.strictEqual(request.session.foo, 'bar')
    reply.send(200)
  })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should handle path properly /2', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.assert.strictEqual(request.session.foo, 'bar')
    reply.send(200)
  })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should handle path properly /2', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check/page1', (request, reply) => {
    t.assert.strictEqual(request.session.foo, 'bar')
    reply.send(200)
  })

  await fastify.ready()

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should handle path properly /3', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check_page1', (request, reply) => {
    t.assert.strictEqual(request.session.foo, undefined)
    reply.send(200)
  })
  await fastify.ready()

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check_page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
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
    t.assert.strictEqual(request.session.foo, undefined)
    reply.send(200)
  })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/chick/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should handle path properly /4', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/chick/page1', (request, reply) => {
    t.assert.strictEqual(request.session.foo, undefined)
    reply.send(200)
  })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/chick/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should handle path properly /5', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, options)
  fastify.post('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/chck', (request, reply) => {
    t.assert.strictEqual(request.session.foo, undefined)
    reply.send(200)
  })

  const response1 = await fastify.inject({
    url: '/check',
    method: 'POST'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/chck',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should handle path properly /6', async (t) => {
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
    t.assert.strictEqual(request.session.foo, 'bar')
    reply.send(200)
  })

  const response1 = await fastify.inject({
    url: '/check/index',
    method: 'POST'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should handle path properly /7', async (t) => {
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
    t.assert.strictEqual(request.session.foo, 'bar')
    reply.send(200)
  })

  const response1 = await fastify.inject({
    url: '/check/index',
    method: 'POST'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

// test('should handle path properly /8', async (t) => {
//   t.plan(7)
//   const fastify = Fastify()
//
//   const options = {
//     secret: DEFAULT_SECRET,
//     cookie: { secure: false, path: '/check' }
//   }
//   await fastify.register(fastifyCookie)
//   await fastify.register(fastifySession, options)
//   fastify.post('/check/index', async (request, reply) => {
//     request.session.foo = 'bar'
//     reply.send(200)
//   })
//   fastify.get('/check/page1', async (request, reply) => {
//     t.assert.strictEqual(request.session.foo, 'bar')
//     reply.send(200)
//   })
//   fastify.get('/chck/page1', async (request, reply) => {
//     t.assert.strictEqual(request.session.foo, null)
//     reply.send(200)
//   })
//
//   const response1 = await fastify.inject({
//     url: '/check/index',
//     method: 'POST'
//   })
//
//   t.assert.strictEqual(response1.statusCode, 200)
//
//   const response2 = await fastify.inject({
//     url: '/check/page1',
//     headers: { Cookie: response1.headers['set-cookie'] }
//   })
//   t.assert.strictEqual(response2.statusCode, 200)
//
//   const response3 = await fastify.inject({
//     url: '/chck/page1',
//     headers: { Cookie: response1.headers['set-cookie'] }
//   })
//   t.assert.strictEqual(response3.statusCode, 200)
//
//   const response4 = await fastify.inject({
//     url: '/check/page1',
//     headers: { Cookie: response1.headers['set-cookie'] }
//   })
//   t.assert.strictEqual(response4.statusCode, 200)
// })

test('should handle path properly /9', async (t) => {
  // Let's check that a search part of the url doesn't spoil the path verification

  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, path: '/check' }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/check', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check/page1', (request, reply) => {
    t.assert.strictEqual(request.session.foo, 'bar')
    reply.send(200)
  })

  const response1 = await fastify.inject({
    url: '/check',
    query: {
      foo: 'bar'
    }
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check/page1',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})
