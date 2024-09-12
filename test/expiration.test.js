'use strict'

const test = require('node:test')
const { buildFastify, DEFAULT_SECRET } = require('./util')
const { setTimeout: sleep } = require('node:timers/promises')

test('sessions should be deleted if expired', async (t) => {
  t.plan(5)

  const sessions = {}
  const options = {
    secret: DEFAULT_SECRET,
    store: {
      get (id, cb) {
        t.assert.ok(id)
        cb(null, sessions[id])
      },
      set (id, session, cb) {
        sessions[id] = session
        cb()
      },
      destroy (id, cb) {
        t.assert.ok(id)
        cb()
      }
    },
    cookie: { maxAge: 1000, secure: false }
  }

  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, options)
  t.after(() => {
    fastify.close()
  })

  let response
  response = await fastify.inject({
    url: '/'
  })

  const initialSession = response.headers['set-cookie']
    .split(' ')[0]
    .replace(';', '')
  t.assert.ok(initialSession.startsWith('sessionId='))

  // Wait for the cookie to expire
  await sleep(2000)

  response = await fastify.inject({
    url: '/',
    headers: {
      Cookie: initialSession
    }
  })

  const endingSession = response.headers['set-cookie']
    .split(' ')[0]
    .replace(';', '')
  t.assert.ok(endingSession.startsWith('sessionId='))

  t.assert.notEqual(initialSession, endingSession)
})
