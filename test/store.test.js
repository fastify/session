'use strict'

const test = require('ava')
const fastifyPlugin = require('fastify-plugin')
const { testServer, request, DEFAULT_OPTIONS, DEFAULT_COOKIE } = require('./util')
const { Store } = require('..')

test('should decorate request with sessionStore', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.sessionStore)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response } = await request({
    url: `http://localhost:${port}`
  })

  t.is(response.statusCode, 200)
})

test('should pass error on store.set to done', async (t) => {
  t.plan(1)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new FailingStore()
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode } = await request({
    url: `http://localhost:${port}`,
    headers: { 'x-forwarded-proto': 'https' }
  })

  t.is(statusCode, 500)
})

test('should create new session if ENOENT error on store.get', async (t) => {
  t.plan(3)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new EnoentErrorStore()
  }
  const port = await testServer((request, reply) => {
    request.session.test = {}
    reply.send(200)
  }, options)

  const { statusCode, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: {
      cookie: DEFAULT_COOKIE,
      'x-forwarded-proto': 'https'
    }
  })

  t.is(statusCode, 200)
  t.false(cookie.includes('AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg'))
  t.regex(cookie, /sessionId=[\w-]{32}.[\w-%]{43,55}; Path=\/; HttpOnly; Secure/)
})

test('should pass error to done if non-ENOENT error on store.get', async (t) => {
  t.plan(1)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new FailingStore()
  }
  const port = await testServer((request, reply) => reply.send(200), options)

  const { statusCode } = await request({
    url: `http://localhost:${port}`,
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.is(statusCode, 500)
})

test('should set new session cookie if expired', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new FailOnDestroyStore()
  }
  const plugin = fastifyPlugin(async (fastify, opts) => {
    fastify.addHook('onRequest', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        expires: Date.now() - 1000
      }, done)
    })
  })
  function handler (request, reply) {
    request.session.test = {}
    reply.send(200)
  }
  const port = await testServer(handler, options, plugin)

  const { statusCode, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.is(statusCode, 500)
  t.is(cookie, null)
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
