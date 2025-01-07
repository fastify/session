'use strict'

const test = require('node:test')
const fastifyPlugin = require('fastify-plugin')
const { buildFastify, DEFAULT_OPTIONS, DEFAULT_COOKIE, DEFAULT_SECRET, DEFAULT_SESSION_ID } = require('./util')

test('should decorate request with sessionStore', async (t) => {
  t.plan(2)

  const fastify = await buildFastify((request, reply) => {
    t.assert.ok(request.sessionStore)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should pass error on store.set to done', async (t) => {
  t.plan(1)
  const options = {
    secret: DEFAULT_SECRET,
    store: new FailingStore()
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => fastify.close())

  const { statusCode } = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.assert.strictEqual(statusCode, 500)
})

test('should create new session if ENOENT error on store.get', async (t) => {
  t.plan(5)
  const options = {
    secret: DEFAULT_SECRET,
    store: new EnoentErrorStore()
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.assert.strictEqual(response.headers['set-cookie'].includes('AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg'), false)
  const pattern = String.raw`sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure`
  t.assert.strictEqual(RegExp(pattern).test(response.headers['set-cookie']), true)
  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.cookies[0].name, 'sessionId')
  t.assert.strictEqual(response.cookies[0].value.includes('AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg'), false)
})

test('should pass error to done if non-ENOENT error on store.get', async (t) => {
  t.plan(1)
  const options = {
    secret: DEFAULT_SECRET,
    store: new FailingStore()
  }

  const fastify = await buildFastify((_request, reply) => {
    reply.send(200)
  }, options)
  t.after(() => fastify.close())

  const { statusCode } = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.assert.strictEqual(statusCode, 500)
})

test('should set new session cookie if expired', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    store: new FailOnDestroyStore()
  }
  const plugin = fastifyPlugin(async (fastify) => {
    fastify.addHook('onRequest', (request, _reply, done) => {
      request.sessionStore.set(DEFAULT_SESSION_ID, {
        cookie: {
          expires: new Date(Date.now() - 1000)
        }
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const fastify = await buildFastify(handler, options, plugin)
  t.after(() => fastify.close())

  const { statusCode, cookie } = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.assert.strictEqual(statusCode, 500)
  t.assert.strictEqual(cookie, undefined)
})

class FailOnDestroyStore {
  constructor () {
    this.store = {}
  }

  set (sessionId, session, callback) {
    this.store[sessionId] = session
    callback()
  }

  get (sessionId, callback) {
    const session = this.store[sessionId]
    callback(null, session)
  }

  destroy (_sessionId, callback) {
    callback(new Error())
  }
}

class EnoentErrorStore {
  constructor () {
    this.store = {}
  }

  set (sessionId, session, callback) {
    this.store[sessionId] = session
    callback()
  }

  get (_sessionId, callback) {
    const error = Object.assign(new Error(), { code: 'ENOENT' })
    callback(error)
  }

  destroy (sessionId, callback) {
    this.store[sessionId] = undefined
    callback()
  }
}

class FailingStore {
  set (_sessionId, _session, callback) {
    callback(new Error('store.set'))
  }

  get (_sessionId, callback) {
    callback(new Error())
  }

  destroy (_sessionId, callback) {
    callback(new Error())
  }
}
