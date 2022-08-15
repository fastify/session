'use strict'

const Fastify = require('fastify')
const fastifySession = require('..')
const fastifyCookie = require('@fastify/cookie')

const fastify = Fastify()

fastify.register(fastifyCookie, {})
fastify.register(fastifySession, {
  secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
  cookie: { secure: false }
})

fastify.get('/', async (request, reply) => {
  reply
    .send(request.cookies.sessionId)
})

const response = fastify.inject('/')
response.then(v => console.log(`

autocannon -H "Cookie=${decodeURIComponent(v.headers['set-cookie'])}" http://127.0.0.1:3000`))

fastify.listen({ port: 3000 })
