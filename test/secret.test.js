'use strict'

const test = require('ava')
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('..')

test('register should fail if no secret is specified', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = {}
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  await t.throwsAsync(fastify.ready, { instanceOf: Error, message: 'the secret option is required!' })
})

test('register should succeed if valid secret is specified', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk' }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  t.truthy(await fastify.ready())
})

test('register should fail if the secret is too short', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: 'geheim' }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  await t.throwsAsync(fastify.ready, { instanceOf: Error, message: 'the secret must have length 32 or greater' })
})

test('register should succeed if secret is short, but in an array', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: ['geheim'] }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  t.truthy(await fastify.ready())
})

test('register should succeed if multiple secrets are present', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: ['geheim', 'test'] }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  t.truthy(await fastify.ready())
})

test('register should fail if no secret is present in array', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: [] }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  await t.throwsAsync(fastify.ready, { instanceOf: Error, message: 'at least one secret is required' })
})
