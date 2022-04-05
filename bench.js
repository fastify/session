'use strict'

const cronometro = require('cronometro')
const Fastify = require('fastify')
const fastifyCookie = require('fastify-cookie')
const fileStoreFactory = require('session-file-store')
const redisStoreFactory = require('connect-redis')
const { createClient: createRedisClient } = require('redis')
const fastifySession = require('.')
const oldFastifySession = require('published-session')
const fastifyPlugin = require('fastify-plugin')

const sessionPlugin = async (fastify, { plugin, storeType }) => {
  const FileStore = fileStoreFactory(plugin)
  const RedisStore = redisStoreFactory(plugin)
  const redisClient = createRedisClient({ legacyMode: true })
  // only run this if you have redis running on localhost:6379
  await redisClient.connect()

  fastify.register(fastifyCookie)

  fastify.register(plugin, {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    saveUninitialized: false,
    cookie: { secure: false },
    store: storeType === 'redis'
      ? new RedisStore({ client: redisClient })
      : storeType === 'file'
        ? new FileStore({})
        : undefined
  })
}

const getServer = (plugin, storeType) => {
  let requestCounter = 0

  const fastify = Fastify()

  fastify.register(fastifyPlugin(sessionPlugin), { plugin, storeType })

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

const testFunction = (sessionPlugin, storeType) => {
  const server = getServer(sessionPlugin, storeType)

  return async () => {
    const { headers } = await server.inject('/')
    const setCookieHeader = headers['set-cookie']

    if (!setCookieHeader) {
      throw new Error('Missing set-cookie header')
    }

    const { sessionId } = server.parseCookie(setCookieHeader)

    // make 25 "requests" with the new session
    for (let i = 0; i < 25; i++) {
      await server.inject({ path: '/', headers: { cookie: `sessionId=${sessionId}` } })
    }
  }
}

cronometro(
  {
    'current code (memory)': testFunction(fastifySession),
    'old code (memory)': testFunction(oldFastifySession),
    'current code (file)': testFunction(fastifySession, 'file'),
    'old code (file)': testFunction(oldFastifySession, 'file'),
    'current code (redis)': testFunction(fastifySession, 'redis'),
    'old code (redis)': testFunction(oldFastifySession, 'redis')
  },
  { iterations: 25 }
)
