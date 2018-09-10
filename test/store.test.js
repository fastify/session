'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const request = require('request')
const fastifyCookie = require('fastify-cookie')
const fastifyPlugin = require('fastify-plugin')
const fastifySession = require('..')

test('should decorate request with sessionStore', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    t.ok(request.sessionStore)
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})

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

test('should pass error on store.set to done', t => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new FailingStore()
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })
})

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

test('should create new session if ENOENT error on store.get', t => {
  t.plan(7)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new EnoentErrorStore()
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(!response.headers['set-cookie'][0].includes('AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg'))
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should pass error to done if non-ENOENT error on store.get', t => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new FailingStore()
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })
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

test('should set new session cookie if expired', t => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new FailOnDestroyStore()
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        expires: Date.now() - 900000
      }, (err) => {
        done(err)
      })
    })
    next()
  }, '>=0.30.2'))
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })
})

test('store should be an event emitter', t => {
  t.plan(1)

  t.on('test', () => t.ok(true))
  t.emit('test')
})
