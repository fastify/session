'use strict'

const test = require('ava')
const Fastify = require('fastify')
const fastifyCookie = require('fastify-cookie')
const fastifySession = require('..')

test.cb('register should fail if no secret is specified', t => {
  t.plan(1)
  const fastify = Fastify()

  const options = {}
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.ready((err) => {
    t.true(err instanceof Error)
    t.end()
  })
})

test.cb('register should succeed if valid secret is specified', t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk' }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.ready((err) => {
    t.falsy(err)
    t.end()
  })
})

test.cb('register should fail if the secret is too short', t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: 'geheim' }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.ready((err) => {
    t.true(err instanceof Error)
    t.end()
  })
})
