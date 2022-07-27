'use strict'

const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('../lib/fastifySession')

const DEFAULT_OPTIONS = { secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk' }
const DEFAULT_COOKIE_VALUE = 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE'
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
  DEFAULT_COOKIE_VALUE,
  DEFAULT_COOKIE,
  DEFAULT_OPTIONS
}
