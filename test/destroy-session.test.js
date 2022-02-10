'use strict'

const test = require('ava')
const { testServer, request, DEFAULT_OPTIONS } = require('./util')

class ErrorStore {
  get (sessionId, callback) {
    throw new Error('Not implemented')
  }

  set (sessionId, session, callback) {
    throw new Error('Not implemented')
  }

  destroy (sessionId, callback) {
    callback(new Error('ErrorStore#destroy'))
  }
}

test('should successfully destroy the session with callback api', async (t) => {
  t.plan(3)
  const port = await testServer((request, reply) => {
    request.destroySession((err) => {
      t.falsy(err)
      t.is(request.session, null)
      reply.send(200)
    })
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should fail to destroy the session with callback api', async (t) => {
  t.plan(3)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new ErrorStore()
  }
  const port = await testServer((request, reply) => {
    request.destroySession((err) => {
      t.true(err instanceof Error)
      t.is(err.message, 'ErrorStore#destroy')
      reply.send(200)
    })
  }, options)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should successfully destroy the session with promise api', async (t) => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    try {
      await request.destroySession()
      t.is(request.session, null)
      reply.send(200)
    } catch (err) {
      t.fail(err)
    }
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should fail to destroy the session with promise api', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store: new ErrorStore()
  }
  const port = await testServer(async (request, reply) => {
    await t.throwsAsync(async () => await request.destroySession(), {
      instanceOf: Error,
      message: 'ErrorStore#destroy'
    })
    reply.send(200)
  }, options)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})
