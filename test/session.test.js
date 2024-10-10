'use strict'

const test = require('node:test')
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('..')
const { buildFastify, DEFAULT_OPTIONS, DEFAULT_COOKIE, DEFAULT_SESSION_ID, DEFAULT_SECRET, DEFAULT_COOKIE_VALUE } = require('./util')
const { setTimeout: sleep } = require('timers/promises')

test('should add session object to request', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.assert.ok(request.session)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should destroy the session', async (t) => {
  t.plan(3)
  const fastify = await buildFastify((request, reply) => {
    request.session.destroy((err) => {
      t.assert.ifError(err)
      t.assert.strictEqual(request.session, null)
      reply.send(200)
    })
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should add session.encryptedSessionId object to request', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.assert.ok(request.session.encryptedSessionId)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should add session.cookie object to request', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.assert.ok(request.session.cookie)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should add session.sessionId object to request', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.assert.ok(request.session.sessionId)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should allow get/set methods for fetching/updating session values', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    request.session.set('foo', 'bar')
    t.assert.strictEqual(request.session.get('foo'), 'bar')
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should use custom sessionId generator if available (without request)', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.assert.ok(request.session.sessionId.startsWith('custom-'))
    reply.send(200)
  }, {
    idGenerator: () => {
      return `custom-${
        new Date().getTime()
      }-${
        Math.random().toString().slice(2)
      }`
    },
    ...DEFAULT_OPTIONS
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should keep user data in session throughout the time', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.assert.strictEqual(request.session.foo, 'bar')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should generate new sessionId', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false }
  }
  let oldSessionId
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    oldSessionId = request.session.sessionId
    request.session.regenerate(error => {
      if (error) {
        reply.status(500).send('Error ' + error)
      } else {
        reply.send(200)
      }
    })
  })
  fastify.get('/check', (request, reply) => {
    t.assert.notStrictEqual(request.session.sessionId, oldSessionId)
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should generate new sessionId keeping ignoreFields', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false }
  }
  let oldSessionId
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    oldSessionId = request.session.sessionId
    request.session.set('message', 'hello world')
    request.session.regenerate(['message'], error => {
      if (error) {
        reply.status(500).send('Error ' + error)
      } else {
        reply.send(200)
      }
    })
  })
  fastify.get('/check', (request, reply) => {
    t.assert.notStrictEqual(request.session.sessionId, oldSessionId)
    t.assert.strictEqual(request.session.get('message'), 'hello world')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should generate new sessionId keeping ignoreFields (async)', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false }
  }
  let oldSessionId
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', async (request, reply) => {
    oldSessionId = request.session.sessionId
    request.session.set('message', 'hello world')
    await request.session.regenerate(['message'])
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.assert.notStrictEqual(request.session.sessionId, oldSessionId)
    t.assert.strictEqual(request.session.get('message'), 'hello world')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.assert.strictEqual(response2.statusCode, 200)
})

test('should decorate the server with decryptSession', async t => {
  t.plan(2)
  const fastify = Fastify()

  const options = { secret: DEFAULT_SECRET }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  t.after(() => fastify.close())

  t.assert.ok(await fastify.ready())
  t.assert.ok(fastify.decryptSession)
})

test('should decryptSession with custom request object', async (t) => {
  t.plan(5)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET
  }

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.addHook('onRequest', (request, reply, done) => {
    request.sessionStore.set(DEFAULT_SESSION_ID, {
      testData: 'this is a test',
      cookie: { secure: true, httpOnly: true, path: '/', expires: new Date(Date.now() + 1000) }
    }, done)
  })

  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })
  t.assert.strictEqual(response.statusCode, 200)

  const { sessionId } = fastify.parseCookie(DEFAULT_COOKIE)
  const requestObj = {}
  fastify.decryptSession(sessionId, requestObj, () => {
    // it should be possible to save the session
    requestObj.session.save(err => {
      t.assert.ifError(err)
    })
    t.assert.strictEqual(requestObj.session.cookie.originalMaxAge, null)
    t.assert.strictEqual(requestObj.session.testData, 'this is a test')
    t.assert.strictEqual(requestObj.session.sessionId, DEFAULT_SESSION_ID)
  })
})

test('should decryptSession with custom cookie options', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET
  }

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })
  t.assert.strictEqual(response.statusCode, 200)

  const { sessionId } = fastify.parseCookie(DEFAULT_COOKIE)
  const requestObj = {}
  fastify.decryptSession(sessionId, requestObj, { maxAge: 86400 }, () => {
    t.assert.strictEqual(requestObj.session.cookie.originalMaxAge, 86400)
  })
})

test('should bubble up errors with destroy call if session expired', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  const store = {
    set (id, data, cb) { cb(null) },
    get (id, cb) {
      cb(null, { cookie: { expires: new Date(Date.now() - 1000) } })
    },
    destroy (id, cb) { cb(new Error('No can do')) }
  }

  const options = {
    secret: DEFAULT_SECRET,
    store,
    cookie: { secure: false }
  }

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: 'sessionId=_TuQsCBgxtHB3bu6wsRpTXfjqR5sK-q_.3mu5mErW+QI7w+Q0V2fZtrztSvqIpYgsnnC8LQf6ERY;' }
  })
  t.assert.strictEqual(response.statusCode, 500)
  t.assert.strictEqual(JSON.parse(response.body).message, 'No can do')
})

test('should not reset session cookie expiration if rolling is false', async (t) => {
  t.plan(3)

  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    rolling: false,
    cookie: { secure: false, maxAge: 10000 }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.addHook('onRequest', async (request, reply) => {
    await sleep(1)
    reply.send(request.session.expires)
  })

  fastify.get('/', (request, reply) => reply.send(200))
  fastify.get('/check', (request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.assert.strictEqual(response2.statusCode, 200)

  t.assert.strictEqual(response1.body, response2.body)
})

test('should update the expires property of the session using Session#touch() even if rolling is false', async (t) => {
  t.plan(3)

  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    rolling: false,
    cookie: { secure: false, maxAge: 10000 }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.addHook('onRequest', async (request, reply) => {
    await sleep(1)
    request.session.touch()
    reply.send(request.session.cookie.expires)
  })

  fastify.get('/', (request, reply) => reply.send(200))
  fastify.get('/check', (request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.assert.strictEqual(response1.statusCode, 200)

  await new Promise(resolve => setTimeout(resolve, 1))

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.assert.strictEqual(response2.statusCode, 200)

  t.assert.notStrictEqual(response1.body, response2.body)
})

test('should use custom sessionId generator if available (with request)', async (t) => {
  const fastify = Fastify()
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: DEFAULT_SECRET,
    cookie: { secure: false, maxAge: 10000 },
    idGenerator: (request) => {
      if (request.session?.returningVisitor) return `returningVisitor-${new Date().getTime()}`
      else return `custom-${new Date().getTime()}`
    }
  })
  t.after(() => fastify.close())

  fastify.get('/', (request, reply) => {
    reply.status(200).send(request.session.sessionId)
  })
  fastify.get('/login', (request, reply) => {
    request.session.returningVisitor = true
    request.session.regenerate(error => {
      if (error) {
        reply.status(500).send('Error ' + error)
      } else {
        reply.status(200).send('OK ' + request.session.sessionId)
      }
    })
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.assert.strictEqual(response1.statusCode, 200)
  t.assert.notStrictEqual(response1.headers['set-cookie'], undefined)
  t.assert.ok(response1.body.startsWith('custom-'))

  const response2 = await fastify.inject({
    url: '/login',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.assert.strictEqual(response2.statusCode, 200)
  t.assert.notStrictEqual(response2.headers['set-cookie'], undefined)

  const response3 = await fastify.inject({
    url: '/',
    headers: { Cookie: response2.headers['set-cookie'] }
  })
  t.assert.strictEqual(response3.statusCode, 200)
  t.assert.ok(response3.body.startsWith('returningVisitor-'))
})

test('should use custom sessionId generator if available (with request and rolling false)', async (t) => {
  const fastify = Fastify()
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: DEFAULT_SECRET,
    rolling: false,
    cookie: { secure: false, maxAge: 10000 },
    idGenerator: (request) => {
      if (request.session?.returningVisitor) {
        return `returningVisitor-${
          new Date().getTime()
        }-${
          Math.random().toString().slice(2)
        }`
      }
      return `custom-${
        new Date().getTime()
      }-${
        Math.random().toString().slice(2)
      }`
    }
  })
  t.after(() => fastify.close())

  fastify.get('/', (request, reply) => {
    reply.status(200).send(request.session.sessionId)
  })
  fastify.get('/login', (request, reply) => {
    request.session.returningVisitor = true
    request.session.regenerate(error => {
      if (error) {
        reply.status(500).send('Error ' + error)
      } else {
        reply.status(200).send('OK ' + request.session.sessionId)
      }
    })
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.assert.strictEqual(response1.statusCode, 200)
  t.assert.notStrictEqual(response1.headers['set-cookie'], undefined)
  t.assert.ok(response1.body.startsWith('custom-'))

  const response2 = await fastify.inject({
    url: '/login',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.assert.strictEqual(response2.statusCode, 200)
  t.assert.notStrictEqual(response2.headers['set-cookie'], undefined)

  const response3 = await fastify.inject({
    url: '/',
    headers: { Cookie: response2.headers['set-cookie'] }
  })
  t.assert.strictEqual(response3.statusCode, 200)
  t.assert.ok(response3.body.startsWith('returningVisitor-'))
})

test('should reload the session', async (t) => {
  t.plan(4)
  const fastify = await buildFastify((request, reply) => {
    request.session.someData = 'some-data'
    t.assert.strictEqual(request.session.someData, 'some-data')

    request.session.reload((err) => {
      t.assert.deepStrictEqual(err, null)

      t.assert.strictEqual(request.session.someData, undefined)

      reply.send(200)
    })
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('should save the session', async (t) => {
  t.plan(6)
  const fastify = await buildFastify((request, reply) => {
    request.session.someData = 'some-data'
    t.assert.strictEqual(request.session.someData, 'some-data')

    request.session.save((err) => {
      t.assert.ifError(err)

      t.assert.strictEqual(request.session.someData, 'some-data')

      // unlike previous test, here the session data remains after a save
      request.session.reload((err) => {
        t.assert.ifError(err)

        t.assert.strictEqual(request.session.someData, 'some-data')

        reply.send(200)
      })
    })
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('destroy supports promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.assert.doesNotReject(request.session.destroy())

    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('destroy supports rejecting promises', async t => {
  t.plan(3)
  const fastify = await buildFastify(async (request, reply) => {
    await t.assert.rejects(
      async () => request.session.destroy(),
      (err) => {
        t.assert.strictEqual(err.message, 'no can do')
        return true
      }
    )

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(null) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(new Error('no can do')) }
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  // 200 since we assert inline and swallow the error
  t.assert.strictEqual(response.statusCode, 200)
})

test('regenerate supports promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.assert.doesNotReject(request.session.regenerate())

    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('regenerate supports rejecting promises', async t => {
  t.plan(3)
  const fastify = await buildFastify(async (request, reply) => {
    await t.assert.rejects(
      request.session.regenerate(),
      (err) => {
        t.assert.strictEqual(err.message, 'no can do')
        return true
      }
    )

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(new Error('no can do')) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(null) }
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  // 200 since we assert inline and swallow the error
  t.assert.strictEqual(response.statusCode, 200)
})

test('reload supports promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.assert.doesNotReject(request.session.reload())

    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('reload supports rejecting promises', async t => {
  t.plan(3)
  const fastify = await buildFastify(async (request, reply) => {
    await t.assert.rejects(
      request.session.reload(),
      (err) => {
        t.assert.strictEqual(err.message, 'no can do')
        return true
      }
    )

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(null) },
      get (id, cb) { cb(new Error('no can do')) },
      destroy (id, cb) { cb(null) }
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  // 200 since we assert inline and swallow the error
  t.assert.strictEqual(response.statusCode, 200)
})

test('save supports promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.assert.doesNotReject(request.session.save())

    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200)
})

test('save supports rejecting promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.assert.rejects(request.session.save())

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(new Error('no can do')) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(null) }
    }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  // 200 since we assert inline and swallow the error
  t.assert.strictEqual(response.statusCode, 200)
})

test("clears cookie if not backed by a session, and there's nothing to save", async t => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: DEFAULT_COOKIE_VALUE }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.headers['set-cookie'], 'sessionId=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax')
})

test("clearing cookie sets the domain if it's specified in the cookie options", async t => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { domain: 'domain.test' }
  })
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: DEFAULT_COOKIE_VALUE }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.headers['set-cookie'], 'sessionId=; Max-Age=0; Domain=domain.test; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax')
})

test('does not clear cookie if no session cookie in request', async t => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.after(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: 'someOtherCookie=foobar' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.headers['set-cookie'], undefined)
})

test('when rolling is false, only save session when it changes', async t => {
  t.plan(6)
  let setCount = 0
  const store = new Map()

  const fastify = Fastify()
  fastify.register(fastifyCookie)

  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    saveUninitialized: false,
    cookie: { secure: false },
    rolling: false,
    store: {
      set (id, data, cb) {
        ++setCount
        store.set(id, data)
        cb(null)
      },
      get (id, cb) { cb(null, store.get(id)) },
      destroy (id, cb) {
        store.delete(id)
        cb(null)
      }
    }
  })

  fastify.get('/', (request, reply) => {
    request.session.userId = 42

    reply.send(200)
  })

  const response1 = await fastify.inject('/')
  const setCookieHeader1 = response1.headers['set-cookie']

  t.assert.strictEqual(response1.statusCode, 200)
  t.assert.strictEqual(setCount, 1)
  t.assert.strictEqual(typeof setCookieHeader1, 'string')

  const { sessionId } = fastify.parseCookie(setCookieHeader1)

  const response2 = await fastify.inject({ path: '/', headers: { cookie: `sessionId=${sessionId}` } })
  const setCookieHeader2 = response2.headers['set-cookie']

  t.assert.strictEqual(response2.statusCode, 200)
  // still only called once
  t.assert.strictEqual(setCount, 1)
  // no set-cookie
  t.assert.strictEqual(setCookieHeader2, undefined)
})

test('when rolling is false, only save session when it changes, but.assert.notStrictEqual if manually saved', async t => {
  t.plan(5)
  let setCount = 0
  const store = new Map()

  const fastify = Fastify()
  fastify.register(fastifyCookie)

  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    saveUninitialized: false,
    cookie: { secure: false },
    rolling: false,
    store: {
      set (id, data, cb) {
        ++setCount
        store.set(id, data)
        cb(null)
      },
      get (id, cb) { cb(null, store.get(id)) },
      destroy (id, cb) {
        store.delete(id)
        cb(null)
      }
    }
  })

  fastify.get('/', async (request, reply) => {
    request.session.userId = 42

    t.assert.strictEqual(request.session.isModified(), true)

    // manually save the session
    await request.session.save()

    t.assert.strictEqual(request.session.isModified(), false)

    await reply.send(200)
  })

  const { statusCode, headers } = await fastify.inject('/')

  t.assert.strictEqual(statusCode, 200)
  // we manually saved the session, so it should be called once (not once for manual save and once in `onSend`)
  t.assert.strictEqual(setCount, 1)
  t.assert.strictEqual(typeof headers['set-cookie'], 'string')
})

test('when rolling is true, keep saving the session', async t => {
  t.plan(6)
  let setCount = 0
  const store = new Map()

  const fastify = Fastify()
  fastify.register(fastifyCookie)

  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    saveUninitialized: false,
    cookie: { secure: false },
    rolling: true,
    store: {
      set (id, data, cb) {
        ++setCount
        store.set(id, data)
        cb(null)
      },
      get (id, cb) { cb(null, store.get(id)) },
      destroy (id, cb) {
        store.delete(id)
        cb(null)
      }
    }
  })

  fastify.get('/', (request, reply) => {
    request.session.userId = 42

    reply.send(200)
  })

  const response1 = await fastify.inject('/')
  const setCookieHeader1 = response1.headers['set-cookie']

  t.assert.strictEqual(response1.statusCode, 200)
  t.assert.strictEqual(setCount, 1)
  t.assert.strictEqual(typeof setCookieHeader1, 'string')

  const { sessionId } = fastify.parseCookie(setCookieHeader1)

  const response2 = await fastify.inject({ path: '/', headers: { cookie: `sessionId=${sessionId}` } })
  const setCookieHeader2 = response2.headers['set-cookie']

  t.assert.strictEqual(response2.statusCode, 200)
  t.assert.strictEqual(setCount, 2)
  t.assert.strictEqual(typeof setCookieHeader2, 'string')
})

test('will not update expires property of the session using Session#touch() if maxAge is not set', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: DEFAULT_SECRET,
    rolling: false,
    cookie: { secure: false }
  })
  fastify.addHook('onRequest', (request, reply, done) => {
    request.session.touch()
    done()
  })

  fastify.get('/', (request, reply) => reply.send({ expires: request.session.cookie.expires }))
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.assert.strictEqual(response1.statusCode, 200)
  await new Promise(resolve => setTimeout(resolve, 1))
  t.assert.deepStrictEqual(response1.json(), { expires: null })

  const response2 = await fastify.inject({
    url: '/',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.assert.strictEqual(response2.statusCode, 200)
  t.assert.deepStrictEqual(response2.json(), { expires: null })
})

test('should save session if existing, modified, rolling false, and cookie.expires null', async (t) => {
  t.plan(8)

  const fastify = Fastify()
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    cookie: { secure: false },
    rolling: false
  })
  fastify.get('/', (request, reply) => {
    request.session.set('foo', 'bar')
    t.assert.strictEqual(request.session.cookie.expires, null)
    reply.send(200)
  })
  fastify.get('/second', (request, reply) => {
    t.assert.strictEqual(request.session.get('foo'), 'bar')
    request.session.set('foo', 'baz')
    t.assert.strictEqual(request.session.cookie.expires, null)
    reply.send(200)
  })
  fastify.get('/third', (request, reply) => {
    t.assert.strictEqual(request.session.get('foo'), 'baz')
    t.assert.strictEqual(request.session.cookie.expires, null)
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.assert.strictEqual(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/second',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.assert.strictEqual(response2.statusCode, 200)

  const response3 = await fastify.inject({
    url: '/third',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.assert.strictEqual(response3.statusCode, 200)
})

test('Custom options', async t => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    cookie: {
      secure: false,
      path: '/'
    }
  })

  fastify.post('/', (request, reply) => {
    request.session.set('data', request.body)
    request.session.options({ maxAge: 1000 * 60 * 60 })
    reply.send('hello world')
  })

  t.after(() => fastify.close.bind(fastify))

  fastify.get('/', (request, reply) => {
    const data = request.session.get('data')
    if (!data) {
      reply.code(404).send()
      return
    }
    reply.send(data)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      some: 'data'
    }
  }, (error, response) => {
    t.assert.ifError(error)
    t.assert.strictEqual(response.statusCode, 200)
    t.assert.ok(response.headers['set-cookie'])
    const { expires } = response.cookies[0]
    t.assert.strictEqual(expires.toUTCString(), new Date(Date.now() + 1000 * 60 * 60).toUTCString())

    fastify.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: response.headers['set-cookie']
      }
    }, (error, response) => {
      t.assert.ifError(error)
      t.assert.deepStrictEqual(JSON.parse(response.payload), { some: 'data' })
    })
  })

  await sleep()
})

test('Override global options', async t => {
  t.plan(11)

  const fastify = Fastify()
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    cookie: {
      secure: false,
      maxAge: 42,
      path: '/'
    }
  })

  fastify.post('/', (request, reply) => {
    request.session.set('data', request.body)
    request.session.options({ maxAge: 1000 * 60 * 60 })

    reply.send('hello world')
  })

  t.after(async () => await fastify.close())

  fastify.get('/', (request, reply) => {
    const data = request.session.get('data')

    if (!data) {
      reply.code(404).send()
      return
    }
    reply.send(data)
  })

  let response = await fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      some: 'data'
    }
  })
  t.assert.ok(response)
  t.assert.strictEqual(response.statusCode, 200)
  t.assert.ok(response.headers['set-cookie'])
  let cookie = response.cookies[0]
  t.assert.strictEqual(cookie.expires.toUTCString(), new Date(Date.now() + 1000 * 60 * 60).toUTCString())
  t.assert.strictEqual(cookie.path, '/')

  response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      cookie: response.headers['set-cookie']
    }
  })
  t.assert.ok(response)
  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(response.payload), { some: 'data' })
  t.assert.ok(response.headers['set-cookie'])
  cookie = response.cookies[0]
  t.assert.strictEqual(cookie.expires.toUTCString(), new Date(Date.now() + 1000 * 60 * 60).toUTCString())
  t.assert.strictEqual(cookie.path, '/')
})

test('Override global options with regenerate', async t => {
  t.plan(11)

  const fastify = Fastify()
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    cookie: {
      secure: false,
      maxAge: 42,
      path: '/'
    }
  })

  fastify.post('/', (request, reply) => {
    request.session.set('data', request.body)
    request.session.options({ maxAge: 1000 * 60 * 60 }) // maxAge updated to 1 hour

    reply.send('hello world')
  })

  t.after(() => fastify.close.bind(fastify))

  fastify.get('/', async (request, reply) => {
    const data = request.session.get('data')
    await request.session.regenerate()

    if (!data) {
      reply.code(404).send()
      return
    }

    reply.send(data)
  })

  let response = await fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      some: 'data'
    }
  })
  t.assert.ok(response)
  t.assert.strictEqual(response.statusCode, 200)
  t.assert.ok(response.headers['set-cookie'])
  let cookie = response.cookies[0]
  t.assert.strictEqual(cookie.expires.toUTCString(), new Date(Date.now() + 1000 * 60 * 60).toUTCString())
  t.assert.strictEqual(cookie.path, '/')

  response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      cookie: response.headers['set-cookie']
    }
  })

  t.assert.ok(response)
  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(response.payload), { some: 'data' })
  t.assert.ok(response.headers['set-cookie'])
  cookie = response.cookies[0]
  t.assert.strictEqual(cookie.expires.toUTCString(), new Date(Date.now() + 1000 * 60 * 60).toUTCString())
  t.assert.strictEqual(cookie.path, '/')
})
