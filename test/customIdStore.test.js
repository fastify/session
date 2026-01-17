'use strict'

const test = require('node:test')
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('../lib/fastifySession')
const { DEFAULT_OPTIONS, DEFAULT_SESSION_ID, DEFAULT_ENCRYPTED_SESSION_ID } = require('./util')

const idStore = {
  get: (request, key) => request.headers[key.toLowerCase()],
  set: (reply, key, value) => reply.header(key, value),
  clear: (reply, key) => reply.removeHeader(key)
}

test('should set sessionid header with custom id store', async (t) => {
  t.plan(3)
  const fastify = Fastify()
  let sessionId = null

  fastify.addHook('onRequest', async (request) => {
    request.raw.socket.encrypted = true
  })
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    idStore
  })
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    sessionId = request.session.sessionId
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.ok(sessionId)
  const pattern = `${sessionId}\\..{43,57}`
  t.assert.strictEqual(new RegExp(pattern).test(response.headers['sessionid']), true)
})

test('should retrieve sessionid header with custom id store', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    idStore,
    store: {
      get (id, cb) { cb(null, { id }) },
    }
  })
  fastify.get('/', (request, reply) => {
    t.assert.strictEqual(request.session.sessionId, DEFAULT_SESSION_ID)
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: {
      sessionid: DEFAULT_ENCRYPTED_SESSION_ID
    }
  })

  t.assert.strictEqual(response.statusCode, 200)
})
