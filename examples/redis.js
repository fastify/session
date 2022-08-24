'use strict'

const Fastify = require('fastify')
const fastifySession = require('..')
const fastifyCookie = require('@fastify/cookie')
const Redis = require('ioredis')
const redisStoreFactory = require('connect-redis')

const fastify = Fastify()

const RedisStore = redisStoreFactory(fastifySession)
const store = new RedisStore({
  client: new Redis({
    enableAutoPipelining: true
  })
})

fastify.register(fastifyCookie, {})
fastify.register(fastifySession, {
  secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
  cookie: { secure: false },
  store
})

fastify.get('/', (request, reply) => {
  reply
    .send(request.cookies.sessionId)
})

const response = fastify.inject('/')
response.then(v => console.log(`

autocannon -p 10 -H "Cookie=${decodeURIComponent(v.headers['set-cookie'])}" http://127.0.0.1:3000`))

fastify.listen({ port: 3000 })
