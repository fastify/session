'use strict'

const Fastify = require('fastify')
const fastifySession = require('..')
const fastifyCookie = require('@fastify/cookie')
const { createClient } = require('redis')
const { RedisStore } = require('connect-redis')

const fastify = Fastify()

const redisClient = createClient()
redisClient.connect().catch(console.error)

class AtomicRedisStore extends RedisStore {
  async compareAndSet (sessionId, expectedGeneration, session, callback) {
    const script = `
      local current = redis.call('GET', KEYS[1])
      if not current then return 0 end
      local decoded = cjson.decode(current)
      local metadata = decoded['__fastifySessionMetadata']
      local generation = metadata and metadata['generation'] or ARGV[1]
      if generation ~= ARGV[2] then return 0 end
      if tonumber(ARGV[4]) > 0 then
        redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[4])
      else
        redis.call('SET', KEYS[1], ARGV[3])
      end
      return 1
    `

    try {
      const ttl = this.disableTTL ? 0 : this.getTTL(session)
      if (!this.disableTTL && ttl <= 0) {
        const error = new Error('The session does not exist or has changed')
        error.code = 'ENOENT'
        callback(error)
        return
      }

      const result = await this.client.eval(script, {
        keys: [this.prefix + sessionId],
        arguments: [
          sessionId,
          expectedGeneration,
          this.serializer.stringify(session),
          String(ttl)
        ]
      })
      if (result === 0) {
        const error = new Error('The session does not exist or has changed')
        error.code = 'ENOENT'
        callback(error)
        return
      }

      callback()
    } catch (error) {
      callback(error)
    }
  }
}

const store = new AtomicRedisStore({
  client: redisClient
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
response.then(v => console.log(`\n\nautocannon -p 10 -H "Cookie=${decodeURIComponent(v.headers['set-cookie'])}" http://127.0.0.1:3000`))

fastify.listen({ port: 3000 })
