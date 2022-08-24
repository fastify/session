'use strict'

if (process.env.CI) {

  const { mock, before, afterEach, teardown } = require('tap')
  const redisStoreFactory = require('connect-redis')
  const Redis = require('ioredis')
  const fastifySession = require('../lib/fastifySession')

  const RedisStoreFactory = redisStoreFactory(fastifySession)

  const client = new Redis()

  class RedisStore extends RedisStoreFactory {
    constructor () {
      super({ client })
    }
  }


  before(async () => {
    await client.flushall()
  })

  afterEach(async () => {
    await client.flushall()
  })

  teardown(() => client.disconnect())

  mock('./base.test', { '../lib/store': RedisStore })
  mock('./cookie.test', { '../lib/store': RedisStore })
  mock('./session.test', { '../lib/store': RedisStore })
  mock('./idGenerator.test', { '../lib/store': RedisStore })
  mock('./store.test', { '../lib/store': RedisStore })
}