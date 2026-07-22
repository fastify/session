'use strict'

const test = require('node:test')
const { buildFastify, DEFAULT_COOKIE, DEFAULT_OPTIONS, DEFAULT_SECRET, DEFAULT_SESSION_ID } = require('./util')

test('emits create and save hooks for a new session', async t => {
  const events = []
  const fastify = await buildFastify((request, reply) => {
    request.session.set('userId', 'user-1')
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onCreate: (session, request) => events.push({ name: 'create', session, request }),
      onSave: (session, request) => events.push({ name: 'save', session, request })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(events.map(event => event.name), ['create', 'save'])
  t.assert.strictEqual(events[0].request.session, events[0].session)
  t.assert.strictEqual(events[1].request.session, events[1].session)
  t.assert.strictEqual(events[1].session.isSaved(), true)
})

test('emits load and load miss hooks', async t => {
  const events = []
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onCreate: (session, request) => events.push({ name: 'create', session, request }),
      onLoad: (session, request) => events.push({ name: 'load', session, request }),
      onLoadMiss: (sessionId, request) => events.push({ name: 'load-miss', sessionId, request })
    }
  })
  t.after(() => fastify.close())

  const firstResponse = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.assert.strictEqual(firstResponse.statusCode, 200)
  t.assert.deepStrictEqual(events.map(event => event.name), ['load-miss', 'create'])
  t.assert.strictEqual(events[0].sessionId, DEFAULT_SESSION_ID)
  t.assert.strictEqual(events[0].request.raw.url, '/')
  t.assert.strictEqual(events[1].request.session, events[1].session)
  const createdSessionId = events[1].session.sessionId

  events.length = 0
  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: firstResponse.headers['set-cookie'] }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(events.map(event => event.name), ['load'])
  t.assert.strictEqual(events[0].session.sessionId, createdSessionId)
  t.assert.strictEqual(events[0].request.session, events[0].session)
})

test('passes an invalid cookie value to the load miss hook', async t => {
  const events = []
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onLoadMiss: (sessionId, request) => events.push({ sessionId, request })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: 'sessionId=invalid' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(events.length, 1)
  t.assert.strictEqual(events[0].sessionId, 'invalid')
  t.assert.strictEqual(events[0].request.raw.url, '/')
})

test('emits destroy and regenerate hooks', async t => {
  const events = []
  const fastify = await buildFastify(async (request, reply) => {
    const originalSessionId = request.session.sessionId
    await request.session.regenerate()
    await request.session.destroy()
    reply.send({ originalSessionId })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onRegenerate: (oldId, newId, request) => events.push({
        name: 'regenerate',
        oldId,
        newId,
        requestSessionId: request.session.sessionId
      }),
      onDestroy: (sessionId, request) => events.push({
        name: 'destroy',
        sessionId,
        requestSession: request.session
      })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(events.map(event => event.name), ['regenerate', 'destroy'])
  t.assert.notStrictEqual(events[0].oldId, events[0].newId)
  t.assert.strictEqual(events[0].requestSessionId, events[0].newId)
  t.assert.strictEqual(events[1].sessionId, events[0].newId)
  t.assert.strictEqual(events[1].requestSession, null)
})

test('emits callback lifecycle hook payloads', async t => {
  const events = []
  const errors = []
  const fastify = await buildFastify((request, reply) => {
    const originalSessionId = request.session.sessionId
    request.session.regenerate(error => {
      if (error) return reply.send(error)

      const regeneratedSessionId = request.session.sessionId
      request.session.destroy(error => {
        if (error) return reply.send(error)
        reply.send({ originalSessionId, regeneratedSessionId })
      })
    })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onRegenerate: (oldId, newId, request) => {
        events.push({
          name: 'regenerate',
          oldId,
          newId,
          requestSessionId: request.session.sessionId
        })
        throw new Error('regenerate hook')
      },
      onDestroy: (sessionId, request) => {
        events.push({
          name: 'destroy',
          sessionId,
          requestSession: request.session
        })
        throw new Error('destroy hook')
      },
      onError: (error, context, request) => errors.push({ error, context, request })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  await new Promise(resolve => setImmediate(resolve))
  t.assert.deepStrictEqual(events.map(event => event.name), ['regenerate', 'destroy'])
  t.assert.notStrictEqual(events[0].oldId, events[0].newId)
  t.assert.strictEqual(events[0].requestSessionId, events[0].newId)
  t.assert.strictEqual(events[1].sessionId, events[0].newId)
  t.assert.strictEqual(events[1].requestSession, null)
  t.assert.deepStrictEqual(errors.map(({ context }) => context.operation), ['hook:onRegenerate', 'hook:onDestroy'])
  t.assert.strictEqual(errors[0].context.sessionId, events[0].oldId)
  t.assert.strictEqual(errors[1].context.sessionId, events[0].newId)
})

test('emits the save hook for the promise API', async t => {
  const events = []
  const fastify = await buildFastify(async (request, reply) => {
    request.session.set('userId', 'user-1')
    await request.session.save()
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    rolling: false,
    saveUninitialized: false,
    hooks: {
      onSave: (session, request) => events.push({
        session,
        request,
        requestSession: request.session,
        saved: session.isSaved()
      })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(events.length, 1)
  t.assert.strictEqual(events[0].requestSession, events[0].session)
  t.assert.strictEqual(events[0].request.session, events[0].session)
  t.assert.strictEqual(events[0].saved, true)
})

test('reports context from promise lifecycle hook failures', async t => {
  const errors = []
  const fastify = await buildFastify(async (request, reply) => {
    await request.session.regenerate()
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onRegenerate: () => {
        throw new Error('regenerate hook')
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
  t.assert.strictEqual(errors.length, 1)
  t.assert.strictEqual(errors[0].error.message, 'regenerate hook')
  t.assert.strictEqual(errors[0].context.operation, 'hook:onRegenerate')
  t.assert.ok(errors[0].context.sessionId)
})

test('reports context from a promise destroy hook failure', async t => {
  const errors = []
  const fastify = await buildFastify(async (request, reply) => {
    await request.session.destroy()
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onDestroy: () => {
        throw new Error('destroy hook')
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
  t.assert.strictEqual(errors.length, 1)
  t.assert.strictEqual(errors[0].error.message, 'destroy hook')
  t.assert.strictEqual(errors[0].context.operation, 'hook:onDestroy')
  t.assert.ok(errors[0].context.sessionId)
})

test('reports context from a promise save hook failure', async t => {
  const errors = []
  const fastify = await buildFastify(async (request, reply) => {
    request.session.set('userId', 'user-1')
    await request.session.save()
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    rolling: false,
    saveUninitialized: false,
    hooks: {
      onSave: () => {
        throw new Error('save hook')
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
  t.assert.strictEqual(errors.length, 1)
  t.assert.strictEqual(errors[0].error.message, 'save hook')
  t.assert.strictEqual(errors[0].context.operation, 'hook:onSave')
  t.assert.ok(errors[0].context.sessionId)
})

test('reports context from load hook failures', async t => {
  const errors = []
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    hooks: {
      onLoadMiss: () => {
        throw new Error('load miss hook')
      },
      onLoad: () => {
        throw new Error('load hook')
      },
      onError: (error, context) => errors.push({ error, context })
    }
  })
  t.after(() => fastify.close())

  const firstResponse = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })
  await new Promise(resolve => setImmediate(resolve))

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: firstResponse.headers['set-cookie'] }
  })
  await new Promise(resolve => setImmediate(resolve))

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(errors.map(({ context }) => context.operation), ['hook:onLoadMiss', 'hook:onLoad'])
  t.assert.strictEqual(errors[0].context.sessionId, DEFAULT_SESSION_ID)
  t.assert.ok(errors[1].context.sessionId)
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

test('emits insecure connection when cookie saving is skipped', async t => {
  const reasons = []
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    secret: DEFAULT_SECRET,
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
  t.assert.deepStrictEqual(reasons, ['insecure-connection'])
})

test('emits expire hook for an expired session', async t => {
  const events = []
  const errors = []
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
      onExpire: (sessionId, request) => {
        events.push({ sessionId, request })
        throw new Error('expire hook')
      },
      onError: (error, context) => errors.push({ error, context })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.assert.strictEqual(response.statusCode, 200)
  await new Promise(resolve => setImmediate(resolve))
  t.assert.strictEqual(events.length, 1)
  t.assert.strictEqual(events[0].sessionId, DEFAULT_SESSION_ID)
  t.assert.strictEqual(events[0].request.raw.url, '/')
  t.assert.strictEqual(errors[0].error.message, 'expire hook')
  t.assert.strictEqual(errors[0].context.operation, 'hook:onExpire')
  t.assert.strictEqual(errors[0].context.sessionId, DEFAULT_SESSION_ID)
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
      onError: (error, context, request) => errors.push({ error, context, request })
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
  t.assert.ok(errors.every(({ context, request }) => context.sessionId === request.session.sessionId))
})

test('reports store errors from promise session APIs', async t => {
  const errors = []
  let setCalls = 0
  const fastify = await buildFastify(async (request, reply) => {
    request.session.set('userId', 'user-1')
    try {
      await request.session.save()
    } catch {}
    try {
      await request.session.destroy()
    } catch {}
    reply.send({ ok: true })
  }, {
    secret: DEFAULT_SECRET,
    rolling: false,
    saveUninitialized: false,
    cookie: { secure: false },
    store: {
      set (_sessionId, _session, callback) {
        setCalls++
        callback(setCalls === 1 ? new Error('store.save') : undefined)
      },
      get (_sessionId, callback) {
        callback(null, null)
      },
      destroy (_sessionId, callback) {
        callback(new Error('store.destroy'))
      }
    },
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
  t.assert.deepStrictEqual(errors.map(({ error }) => error.message), ['store.save', 'store.destroy'])
  t.assert.deepStrictEqual(errors.map(({ context }) => context.operation), ['save', 'destroy'])
  t.assert.ok(errors.every(({ context }) => context.sessionId))
})

test('reports errors when loading a session from the store fails', async t => {
  const errors = []
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    secret: DEFAULT_SECRET,
    cookie: { secure: false },
    store: {
      set (_sessionId, _session, callback) {
        callback()
      },
      get (_sessionId, callback) {
        callback(new Error('store.get'))
      },
      destroy (_sessionId, callback) {
        callback()
      }
    },
    hooks: {
      onError: (error, context) => errors.push({ error, context })
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { cookie: DEFAULT_COOKIE }
  })

  t.assert.strictEqual(response.statusCode, 500)
  t.assert.strictEqual(errors[0].error.message, 'store.get')
  t.assert.strictEqual(errors[0].context.operation, 'load')
  t.assert.strictEqual(errors[0].context.sessionId, DEFAULT_SESSION_ID)
})

test('reports destroy errors from the callback API', async t => {
  const errors = []
  const fastify = await buildFastify((request, reply) => {
    request.session.destroy(error => {
      reply.send({ error: error.message })
    })
  }, {
    secret: DEFAULT_SECRET,
    cookie: { secure: false },
    store: {
      set (_sessionId, _session, callback) {
        callback()
      },
      get (_sessionId, callback) {
        callback(null, null)
      },
      destroy (_sessionId, callback) {
        callback(new Error('store.destroy'))
      }
    },
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
  t.assert.strictEqual(errors[0].error.message, 'store.destroy')
  t.assert.strictEqual(errors[0].context.operation, 'destroy')
  t.assert.ok(errors[0].context.sessionId)
})

test('ignores errors thrown by the error hook', async t => {
  const fastify = await buildFastify((_request, reply) => {
    reply.send({ ok: true })
  }, {
    secret: DEFAULT_SECRET,
    cookie: { secure: false },
    store: {
      set (_sessionId, _session, callback) {
        callback(new Error('store.set'))
      },
      get (_sessionId, callback) {
        callback(null, null)
      },
      destroy (_sessionId, callback) {
        callback()
      }
    },
    hooks: {
      onError () {
        throw new Error('onError failed')
      }
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 500)
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
      onError: (error, context, request) => errors.push({ error, context, request })
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
  t.assert.strictEqual(errors[1].context.sessionId, errors[1].request.session.sessionId)
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
