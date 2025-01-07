'use strict'

const test = require('node:test')
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('..')
const crypto = require('node:crypto')

test('fastifySession.checkOptions: register should fail if no secret is specified', async t => {
  t.plan(2)
  const fastify = Fastify()

  const options = {}
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  await t.assert.rejects(
    fastify.ready(),
    (err) => {
      t.assert.strictEqual(err.message, 'the secret option is required, and must be a String, Array of Strings, or a signer object with .sign and .unsign methods')
      return true
    }
  )
})

test('fastifySession.checkOptions: register should succeed if secret with 32 characters is specified', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifyCookie)

  const secret = crypto.randomBytes(16).toString('hex')
  t.assert.strictEqual(secret.length, 32)
  fastify.register(fastifySession, { secret })
  await t.assert.doesNotReject(fastify.ready())
})

test('fastifySession.checkOptions: register should fail if the secret is too short', async t => {
  t.plan(3)
  const fastify = Fastify()

  const secret = crypto.randomBytes(16).toString('hex').slice(0, 31)
  t.assert.strictEqual(secret.length, 31)
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, { secret })
  await t.assert.rejects(
    fastify.ready(),
    (err) => {
      t.assert.strictEqual(err.message, 'the secret must have length 32 or greater')
      return true
    }
  )
})

test('fastifySession.checkOptions: register should succeed if secret is short, but in an array', async t => {
  t.plan(2)
  const fastify = Fastify()

  const secret = crypto.randomBytes(16).toString('hex').slice(0, 31)
  t.assert.strictEqual(secret.length, 31)
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, { secret: [secret] })
  await t.assert.doesNotReject(fastify.ready())
})

test('fastifySession.checkOptions: register should succeed if multiple secrets are present', async t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: [
      crypto.randomBytes(16).toString('hex'),
      crypto.randomBytes(15).toString('hex')
    ]
  })
  await t.assert.doesNotReject(fastify.ready())
})

test('fastifySession.checkOptions: register should fail if no secret is present in array', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, { secret: [] })
  await t.assert.rejects(
    fastify.ready(),
    (err) => {
      t.assert.strictEqual(err.message, 'at least one secret is required')
      return true
    }
  )
})

test('fastifySession.checkOptions: register should fail if a Buffer is passed', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, { secret: crypto.randomBytes(32) })
  await t.assert.rejects(
    fastify.ready(),
    (err) => {
      t.assert.strictEqual(err.message, 'the secret option is required, and must be a String, Array of Strings, or a signer object with .sign and .unsign methods')
      return true
    }
  )
})

test('fastifySession.checkOptions: register should fail if a signer missing unsign is passed', async t => {
  t.plan(2)
  const fastify = Fastify()

  const invalidSigner = {
    sign: (x) => x,
    unsign: true
  }

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, { secret: invalidSigner })
  await t.assert.rejects(
    fastify.ready(),
    (err) => {
      t.assert.strictEqual(err.message, 'the secret option is required, and must be a String, Array of Strings, or a signer object with .sign and .unsign methods')
      return true
    }
  )
})

test('fastifySession.checkOptions: register should fail if a signer missing sign is passed', async t => {
  t.plan(2)
  const fastify = Fastify()

  const invalidSigner = {
    unsign: () => true
  }

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, { secret: invalidSigner })
  await t.assert.rejects(
    fastify.ready(),
    (err) => {
      t.assert.strictEqual(err.message, 'the secret option is required, and must be a String, Array of Strings, or a signer object with .sign and .unsign methods')
      return true
    }
  )
})
