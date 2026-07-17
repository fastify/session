'use strict'

const test = require('node:test')
const { buildFastify, DEFAULT_COOKIE, DEFAULT_OPTIONS, DEFAULT_SECRET } = require('./util')

test('emits create and save hooks for a new session', async t => {
  const events = []
  const fastify = await buildFastify((request, reply) => {
    request.session.set('userId', 'user-1')
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onCreate: () => events.push('create'),
      onSave: () => events.push('save')
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(events, ['create', 'save'])
})

test('emits load and load miss hooks', async t => {
  const events = []
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onCreate: () => events.push('create'),
      onLoad: () => events.push('load'),
      onLoadMiss: () => events.push('load-miss')
    }
  })
  t.after(() => fastify.close())

  const firstResponse = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.assert.strictEqual(firstResponse.statusCode, 200)
  t.assert.deepStrictEqual(events, ['load-miss', 'create'])

  events.length = 0
  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: firstResponse.headers['set-cookie'] }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(events, ['load'])
})

test('emits destroy and regenerate hooks', async t => {
  const events = []
  const fastify = await buildFastify(async (request, reply) => {
    await request.session.regenerate()
    await request.session.destroy()
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onRegenerate: () => events.push('regenerate'),
      onDestroy: () => events.push('destroy')
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(events, ['regenerate', 'destroy'])
})

test('emits cookie skipped when a session does not need saving', async t => {
  const reasons = []
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    secret: DEFAULT_SECRET,
    cookie: { secure: false },
    saveUninitialized: false,
    hooks: {
      onCookieSkipped: reason => reasons.push(reason)
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(reasons, ['not-needed'])
})

test('emits expire hook for an expired session', async t => {
  const events = []
  const store = {
    set (_sessionId, _session, callback) {
      callback()
    },
    get (_sessionId, callback) {
      callback(null, {
        cookie: {
          expires: new Date(Date.now() - 1000)
        }
      })
    },
    destroy (_sessionId, callback) {
      callback()
    }
  }
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    secret: DEFAULT_SECRET,
    store,
    cookie: { secure: false },
    hooks: {
      onExpire: () => events.push('expire')
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(events, ['expire'])
})

test('emits error hook when the store fails', async t => {
  const errors = []
  const store = {
    set (_sessionId, _session, callback) {
      callback(new Error('store.set'))
    },
    get (_sessionId, callback) {
      callback(null, null)
    },
    destroy (_sessionId, callback) {
      callback()
    }
  }
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    secret: DEFAULT_SECRET,
    store,
    cookie: { secure: false },
    hooks: {
      onError: (error, context) => errors.push({ error, context })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 500)
  t.assert.ok(errors.length > 0)
  t.assert.strictEqual(errors[0].error.message, 'store.set')
  t.assert.ok(errors.every(({ context }) => context.operation === 'save'))
})

test('reports synchronous and asynchronous hook errors without failing the request', async t => {
  const errors = []
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onCreate () {
        throw new Error('sync hook')
      },
      onSave: async () => {
        throw new Error('async hook')
      },
      onError: (error, context) => errors.push({ error, context })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  await new Promise(resolve => setImmediate(resolve))

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(errors.map(({ error }) => error.message), ['sync hook', 'async hook'])
  t.assert.deepStrictEqual(errors.map(({ context }) => context.operation), ['hook:onCreate', 'hook:onSave'])
})

test('reports callback errors from regenerate', async t => {
  const errors = []
  const store = {
    set (_sessionId, _session, callback) {
      callback(new Error('store.set'))
    },
    get (_sessionId, callback) {
      callback(null, null)
    },
    destroy (_sessionId, callback) {
      callback()
    }
  }
  const fastify = await buildFastify((request, reply) => {
    request.session.regenerate(error => {
      request.session = null
      reply.send({ error: error.message })
    })
  }, {
    secret: DEFAULT_SECRET,
    store,
    cookie: { secure: false },
    hooks: {
      onError: (error, context) => errors.push({ error, context })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(errors.map(({ context }) => context.operation), ['regenerate'])
})
