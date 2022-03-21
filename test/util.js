'use strict'

const Fastify = require('fastify')
const undici = require('undici')
const fastifyCookie = require('fastify-cookie')
const fastifySession = require('../lib/fastifySession')

const DEFAULT_OPTIONS = { secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk' }
const DEFAULT_COOKIE = 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure'

async function testServer (handler, sessionOptions, plugin) {
  const fastify = Fastify()
  fastify.register(fastifyCookie)
  if (plugin) {
    fastify.register(plugin)
  }
  fastify.register(fastifySession, sessionOptions)
  fastify.get('/', handler)
  await fastify.listen(0)
  fastify.server.unref()
  return fastify.server.address().port
}

async function request (options) {
  let response
  try {
    if (typeof options === 'string') {
      response = await undici.request(options)
    } else {
      response = await undici.request(options.url, options)
    }
  } catch (err) {
    response = err.response
  }
  const { statusCode, body } = response
  const cookie = response.headers['set-cookie']
  return { response, body: await body.text(), statusCode, cookie }
}

module.exports = {
  testServer,
  request,
  DEFAULT_COOKIE,
  DEFAULT_OPTIONS
}
