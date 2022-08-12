'use strict'

const test = require('tap').test
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('..')
const { DEFAULT_SECRET } = require('./util')

test('register should fail if no secret is specified', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = {}
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  await t.rejects(fastify.ready(), 'the secret option is required!')
})

test('register should succeed if valid secret is specified', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: DEFAULT_SECRET }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  await t.resolves(fastify.ready())
})

test('register should fail if the secret is too short', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: 'geheim' }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  await t.rejects(fastify.ready(), 'the secret must have length 32 or greater')
})

test('register should succeed if secret is short, but in an array', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: ['geheim'] }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  await t.resolves(fastify.ready())
})

test('register should succeed if multiple secrets are present', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: ['geheim', 'test'] }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  await t.resolves(fastify.ready())
})

test('register should fail if no secret is present in array', async t => {
  t.plan(1)
  const fastify = Fastify()

  const options = { secret: [] }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  await t.rejects(fastify.ready(), 'at least one secret is required')
})
