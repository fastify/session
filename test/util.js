'use strict'

const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('../lib/fastifySession')

const DEFAULT_SECRET = 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
const DEFAULT_OPTIONS = { secret: DEFAULT_SECRET }
const DEFAULT_SESSION_ID = 'Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN'
const DEFAULT_ENCRYPTED_SESSION_ID = `${DEFAULT_SESSION_ID}.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE`
const DEFAULT_COOKIE_VALUE = `sessionId=${DEFAULT_ENCRYPTED_SESSION_ID};`
const DEFAULT_COOKIE = `${DEFAULT_COOKIE_VALUE}; Path=/; HttpOnly; Secure`

async function buildFastify (handler, sessionOptions, plugin) {
  const fastify = Fastify()
  await fastify.register(fastifyCookie)
  if (plugin) {
    await fastify.register(plugin)
  }
  await fastify.register(fastifySession, sessionOptions)

  fastify.get('/', handler)
  await fastify.listen({ port: 0 })
  return fastify
}

module.exports = {
  buildFastify,
  DEFAULT_SECRET,
  DEFAULT_OPTIONS,
  DEFAULT_SESSION_ID,
  DEFAULT_ENCRYPTED_SESSION_ID,
  DEFAULT_COOKIE_VALUE,
  DEFAULT_COOKIE
}
