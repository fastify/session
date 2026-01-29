'use strict'

const RedisStore = require('connect-redis').default
const Fastify = require('fastify')
const Redis = require('ioredis')
const fileStoreFactory = require('session-file-store')
const { isMainThread } = require('node:worker_threads')

const fastifySession = require('..')
const fastifyCookie = require('@fastify/cookie')

let redisClient

function createServer (sessionPlugin, cookiePlugin, storeType) {
  let requestCounter = 0
  let store

  if (storeType === 'redis') {
    if (!redisClient) {
      redisClient = new Redis({
        clientInfoTag: fastifySession.getDefaultClientInfoTag()
      })
    }
    store = new RedisStore({ client: redisClient })
  } else if (storeType === 'file') {
    const FileStore = fileStoreFactory(sessionPlugin)
    store = new FileStore({})
  }

  const fastify = Fastify()

  fastify.register(cookiePlugin)
  fastify.register(sessionPlugin, {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    saveUninitialized: false,
    cookie: { secure: false },
    store
  })

  fastify.get('/', (request, reply) => {
    // modify session every 10 requests
    if (requestCounter % 10 === 0) {
      request.session.userId = requestCounter
    } else {
      request.session.userId = 0
    }

    requestCounter++

    reply.send(200)
  })

  return fastify
}

function testFunction (sessionPlugin, cookiePlugin, storeType) {
  const server = createServer(sessionPlugin, cookiePlugin, storeType)

  return async function () {
    const { headers } = await server.inject('/')
    const setCookieHeader = headers['set-cookie']

    if (!setCookieHeader) {
      throw new Error('Missing set-cookie header')
    }

    const { sessionId } = server.parseCookie(setCookieHeader)

    // make 25 "requests" with the new session
    await Promise.all(
      new Array(1).fill(0).map(() => server.inject({ path: '/', headers: { cookie: `sessionId=${sessionId}` } }))
    )
  }
}

async function main () {
  const { default: cronometro } = await import('cronometro')

  return cronometro(
    {
      memory: testFunction(fastifySession, fastifyCookie),
      file: testFunction(fastifySession, fastifyCookie, 'file'),
      redis: {
        test: testFunction(fastifySession, fastifyCookie, 'redis'),
        async after () {
          return redisClient.disconnect()
        }
      }
    },
    {
      iterations: 25,
      print: { compare: true }
    }
  )
}

if (isMainThread) {
  main()
    .then(() => redisClient.quit())
    .catch(error => console.error(error))
} else {
  module.exports = main
}
