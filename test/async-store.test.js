'use strict'

const test = require('node:test')
const { buildFastify, DEFAULT_SECRET } = require('./util')
const { getSessionGeneration } = require('../lib/sessionMetadata')
const callStore = require('../lib/callStore')

// A store written with async functions, which settle the promise they return
// and never call the callback
class AsyncStore {
  constructor () {
    this.sessions = new Map()
  }

  async set (sessionStoreId, session) {
    this.sessions.set(sessionStoreId, session)
  }

  async get (sessionStoreId) {
    return this.sessions.get(sessionStoreId) ?? null
  }

  async compareAndSet (sessionStoreId, expectedGeneration, session) {
    const stored = this.sessions.get(sessionStoreId)
    if (!stored || getSessionGeneration(stored, sessionStoreId) !== expectedGeneration) {
      const error = new Error('The session does not exist or has changed')
      error.code = 'ENOENT'
      throw error
    }
    this.sessions.set(sessionStoreId, session)
  }

  async destroy (sessionStoreId) {
    this.sessions.delete(sessionStoreId)
  }
}

const cookieOf = response => response.headers['set-cookie'].split(';')[0]

test('should save and load a session with a store written with async functions', async (t) => {
  const store = new AsyncStore()
  const fastify = await buildFastify((request, reply) => {
    request.session.set('visits', (request.session.get('visits') ?? 0) + 1)
    reply.send({ visits: request.session.get('visits') })
  }, { secret: DEFAULT_SECRET, store })
  t.after(() => fastify.close())

  const first = await fastify.inject({ url: '/', headers: { 'x-forwarded-proto': 'https' } })
  t.assert.strictEqual(first.statusCode, 200)
  t.assert.deepStrictEqual(first.json(), { visits: 1 })
  t.assert.strictEqual(store.sessions.size, 1)

  const second = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https', cookie: cookieOf(first) }
  })
  t.assert.strictEqual(second.statusCode, 200)
  t.assert.deepStrictEqual(second.json(), { visits: 2 })
})

test('should reload and destroy a session with a store written with async functions', async (t) => {
  const store = new AsyncStore()
  const fastify = await buildFastify(async (request) => {
    request.session.set('foo', 'bar')
    await request.session.save()
    await request.session.reload()
    const reloaded = request.session.get('foo')
    await request.session.destroy()
    return { reloaded, destroyed: request.session === null, size: store.sessions.size }
  }, { secret: DEFAULT_SECRET, store })
  t.after(() => fastify.close())

  const response = await fastify.inject({ url: '/', headers: { 'x-forwarded-proto': 'https' } })
  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(response.json(), { reloaded: 'bar', destroyed: true, size: 0 })
})

test('should pass the rejection of a store written with async functions to done', async (t) => {
  const store = new AsyncStore()
  store.set = async () => { throw new Error('set failed') }
  const fastify = await buildFastify((request, reply) => {
    request.session.set('foo', 'bar')
    reply.send(200)
  }, { secret: DEFAULT_SECRET, store })
  t.after(() => fastify.close())

  const response = await fastify.inject({ url: '/', headers: { 'x-forwarded-proto': 'https' } })
  t.assert.strictEqual(response.statusCode, 500)
})

test('should create a new session when a store written with async functions rejects with ENOENT on get', async (t) => {
  const store = new AsyncStore()
  const fastify = await buildFastify((request, reply) => {
    reply.send({ visits: request.session.get('visits') ?? null })
  }, { secret: DEFAULT_SECRET, store })
  t.after(() => fastify.close())

  const first = await fastify.inject({ url: '/', headers: { 'x-forwarded-proto': 'https' } })
  store.get = async () => {
    const error = new Error('not found')
    error.code = 'ENOENT'
    throw error
  }
  const second = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https', cookie: cookieOf(first) }
  })
  t.assert.strictEqual(second.statusCode, 200)
  t.assert.deepStrictEqual(second.json(), { visits: null })
})

test('should settle only once with a store that both calls the callback and returns a promise', async (t) => {
  const sessions = new Map()
  let saves = 0
  // Like stores whose async methods also call an optional callback
  const store = {
    async set (sessionStoreId, session, callback) {
      sessions.set(sessionStoreId, session)
      saves++
      callback()
      return 'OK'
    },
    async get (sessionStoreId, callback) {
      const session = sessions.get(sessionStoreId) ?? null
      callback(null, session)
      return session
    },
    async compareAndSet (sessionStoreId, expectedGeneration, session, callback) {
      sessions.set(sessionStoreId, session)
      saves++
      callback()
    },
    async destroy (sessionStoreId, callback) {
      sessions.delete(sessionStoreId)
      callback()
    }
  }
  let handled = 0
  const fastify = await buildFastify((request, reply) => {
    handled++
    request.session.set('visits', (request.session.get('visits') ?? 0) + 1)
    reply.send({ visits: request.session.get('visits') })
  }, { secret: DEFAULT_SECRET, store })
  t.after(() => fastify.close())

  const first = await fastify.inject({ url: '/', headers: { 'x-forwarded-proto': 'https' } })
  const second = await fastify.inject({
    url: '/',
    headers: { 'x-forwarded-proto': 'https', cookie: cookieOf(first) }
  })
  t.assert.deepStrictEqual(second.json(), { visits: 2 })
  t.assert.strictEqual(handled, 2)
  t.assert.strictEqual(saves, 2)
})

test('should not hide a rejection that comes after the callback was called', (t) => {
  const late = new Error('late rejection')
  let onRejected
  const store = {
    set (sessionStoreId, session, callback) {
      callback()
      return { then (resolve, reject) { onRejected = reject } }
    }
  }
  let calls = 0
  callStore(store, 'set', ['id', {}], () => { calls++ })

  // Rethrown, so the promise chain rejects as it would without the handler
  t.assert.throws(() => onRejected(late), late)
  t.assert.strictEqual(calls, 1)
})
