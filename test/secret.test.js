'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyCookie = require('fastify-cookie')
const fastifySession = require('..')

test('register should fail if no secret is specified', t => {
  t.plan(1)
  const fastify = Fastify()

  const options = {}
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.ready((err) => {
    t.ok(err instanceof Error)
  })
})

test('register should succeed if valid secret is specified', t => {
  t.plan(1)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.ready((err) => {
    t.notOk(err)
  })
})

test('register should fail if the secret is too short', t => {
  t.plan(1)
  const fastify = Fastify()

  const options = {
    secret: 'geheim'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.ready((err) => {
    t.ok(err instanceof Error)
  })
})
