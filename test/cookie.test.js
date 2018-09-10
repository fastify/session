'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const request = require('request')
const fastifyCookie = require('fastify-cookie')
const fastifySession = require('..')

test('should set session cookie', t => {
  t.plan(6)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.addHook('onRequest', (req, res, next) => {
    req.connection.encrypted = true
    next()
  })
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
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should not set session cookie is request is not secure', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.addHook('onRequest', (req, res, next) => {
    req.connection.encrypted = false
    next()
  })
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
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.notOk(response.headers['set-cookie'])
    })
  })
})

test('should not set session cookie is request is not secure and x-forwarded-proto != https', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.addHook('onRequest', (req, res, next) => {
    req.connection.encrypted = false

    next()
  })
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
        'x-forwarded-proto': 'http'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.notOk(response.headers['set-cookie'])
    })
  })
})

test('should not set session cookie is request is not secure and x-forwarded-proto = https', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.addHook('onRequest', (req, res, next) => {
    req.connection.encrypted = false

    next()
  })
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
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'])
    })
  })
})
