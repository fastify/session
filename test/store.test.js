'use strict'

const test = require('tap').test
const fastifyPlugin = require('fastify-plugin')
const { buildFastify, DEFAULT_OPTIONS, DEFAULT_COOKIE, DEFAULT_SECRET, DEFAULT_SESSION_ID } = require('./util')
const { Store } = require('..')

test('should decorate request with sessionStore', async (t) => {
  t.plan(2)

  const fastify = await buildFastify((request, reply) => {
    t.ok(request.sessionStore)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.equal(response.statusCode, 200)
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
  t.teardown(() => fastify.close())

  const { statusCode } = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.equal(statusCode, 500)
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
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.equal(response.headers['set-cookie'].includes('AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg'), false)
  t.match(response.headers['set-cookie'], /sessionId=[\w-]{32}.[\w-%]{43,57}; Path=\/; HttpOnly; Secure/)
  t.equal(response.statusCode, 200)
  t.equal(response.cookies[0].name, 'sessionId')
  t.equal(response.cookies[0].value.includes('AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg'), false)
})

test('should pass error to done if non-ENOENT error on store.get', async (t) => {
  t.plan(1)
  const options = {
    secret: DEFAULT_SECRET,
    store: new FailingStore()
  }

  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, options)
  t.teardown(() => fastify.close())

  const { statusCode } = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.equal(statusCode, 500)
})

test('should set new session cookie if expired', async (t) => {
  t.plan(2)
  const options = {
    secret: DEFAULT_SECRET,
    store: new FailOnDestroyStore()
  }
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set(DEFAULT_SESSION_ID, {
        expires: Date.now() - 1000
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const fastify = await buildFastify(handler, options, plugin)
  t.teardown(() => fastify.close())

  const { statusCode, cookie } = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.equal(statusCode, 500)
  t.equal(cookie, undefined)
})

test('store should be an event emitter', t => {
  t.plan(1)

  const store = new Store()

  store.on('test', () => t.pass())
  store.emit('test')
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

  destroy (sessionId, callback) {
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

  get (sessionId, callback) {
    const error = Object.assign(new Error(), { code: 'ENOENT' })
    callback(error)
  }

  destroy (sessionId, callback) {
    this.store[sessionId] = undefined
    callback()
  }
}

class FailingStore {
  set (sessionId, session, callback) {
    callback(new Error('store.set'))
  }

  get (sessionId, callback) {
    callback(new Error())
  }

  destroy (sessionId, callback) {
    callback(new Error())
  }
}
