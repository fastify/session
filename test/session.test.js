'use strict'

const test = require('tap').test
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('..')
const { buildFastify, DEFAULT_OPTIONS, DEFAULT_COOKIE, DEFAULT_SESSION_ID, DEFAULT_SECRET, DEFAULT_COOKIE_VALUE } = require('./util')
const Cookie = require('cookie');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

test('should add session object to request', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.ok(request.session)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('should destroy the session', async (t) => {
  t.plan(3)
  const fastify = await buildFastify((request, reply) => {
    request.session.destroy((err) => {
      t.same(err, null)
      t.equal(request.session, null)
      reply.send(200)
    })
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('should add session.encryptedSessionId object to request', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.ok(request.session.encryptedSessionId)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('should add session.cookie object to request', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.ok(request.session.cookie)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('should add session.sessionId object to request', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.ok(request.session.sessionId)
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('should allow get/set methods for fetching/updating session values', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    request.session.set('foo', 'bar')
    t.equal(request.session.get('foo'), 'bar')
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('should use custom sessionId generator if available (without request)', async (t) => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    t.ok(request.session.sessionId.startsWith('custom-'))
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
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
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
    t.equal(request.session.foo, 'bar')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should generate new sessionId', async (t) => {
  t.plan(3)
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
    request.session.regenerate(error => {
      if (error) {
        reply.status(500).send('Error ' + error)
      } else {
        reply.send(200)
      }
    })
  })
  fastify.get('/check', (request, reply) => {
    t.not(request.session.sessionId, oldSessionId)
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
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
    t.not(request.session.sessionId, oldSessionId)
    t.equal(request.session.get('message'), 'hello world')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
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
    t.not(request.session.sessionId, oldSessionId)
    t.equal(request.session.get('message'), 'hello world')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })

  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.equal(response2.statusCode, 200)
})

test('should decorate the server with decryptSession', async t => {
  t.plan(2)
  const fastify = Fastify()

  const options = { secret: DEFAULT_SECRET }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  t.teardown(() => fastify.close())

  t.ok(await fastify.ready())
  t.ok(fastify.decryptSession)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })
  t.equal(response.statusCode, 200)

  const { sessionId } = fastify.parseCookie(DEFAULT_COOKIE)
  const requestObj = {}
  fastify.decryptSession(sessionId, requestObj, () => {
    // it should be possible to save the session
    requestObj.session.save(err => {
      t.error(err)
    })
    t.equal(requestObj.session.cookie.originalMaxAge, null)
    t.equal(requestObj.session.testData, 'this is a test')
    t.equal(requestObj.session.sessionId, DEFAULT_SESSION_ID)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/'
  })
  t.equal(response.statusCode, 200)

  const { sessionId } = fastify.parseCookie(DEFAULT_COOKIE)
  const requestObj = {}
  fastify.decryptSession(sessionId, requestObj, { maxAge: 86400 }, () => {
    t.equal(requestObj.session.cookie.originalMaxAge, 86400)
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
  t.teardown(() => { fastify.close() })

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: 'sessionId=_TuQsCBgxtHB3bu6wsRpTXfjqR5sK-q_.3mu5mErW+QI7w+Q0V2fZtrztSvqIpYgsnnC8LQf6ERY;' }
  })
  t.equal(response.statusCode, 500)
  t.equal(JSON.parse(response.body).message, 'No can do')
})

test('should refresh session cookie expiration if refresh is set to nonzero', async (t) => {
  t.plan(9)

  const fastify = Fastify()

  const options = {
    secret: DEFAULT_SECRET,
    rolling: false,
    saveUninitialized: false,
    refresh: 1000, // should refresh cookie after 1 second
    cookie: { secure: false, maxAge: 2000 }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  fastify.get('/check', (request, reply) => {
    request.session.testSessionId = request.session.sessionId;
    return reply.send(request.session.testSessionId)
  })
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  let response1 = await fastify.inject({
    url: '/check'
  })
  t.equal(response1.statusCode, 200)
  t.ok(response1.headers['set-cookie']);
  // we should not get 'set-cookie' header if we sent request
  // within <refresh> interval . Here it is 1000 ms
  await sleep(500);
  let response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.equal(response2.statusCode, 200)
  t.notOk(response2.headers['set-cookie']);

  response1 = await fastify.inject({
    url: '/check'
  })
  t.equal(response1.statusCode, 200)
  t.ok(response1.headers['set-cookie']);
  // we should get 'set-cookie' header if we sent request
  // after <refresh> interval . Here it is 1000 ms
  await sleep(1100);
  response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.equal(response2.statusCode, 200)
  t.ok(response2.headers['set-cookie']);
  t.equal(Cookie.parse(response2.headers['set-cookie']).sessionId, Cookie.parse(response1.headers['set-cookie']).sessionId);
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
  fastify.addHook('onRequest', (request, reply, done) => {
    reply.send(request.session.expires)
    done()
  })

  fastify.get('/', (request, reply) => reply.send(200))
  fastify.get('/check', (request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.equal(response1.statusCode, 200)

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.equal(response2.statusCode, 200)

  t.equal(response1.body, response2.body)
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
  fastify.addHook('onRequest', (request, reply, done) => {
    request.session.touch()
    reply.send(request.session.cookie.expires)
    done()
  })

  fastify.get('/', (request, reply) => reply.send(200))
  fastify.get('/check', (request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.equal(response1.statusCode, 200)

  await new Promise(resolve => setTimeout(resolve, 1))

  const response2 = await fastify.inject({
    url: '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.equal(response2.statusCode, 200)

  t.not(response1.body, response2.body)
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
  t.teardown(() => fastify.close())

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
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.equal(response1.statusCode, 200)
  t.not(response1.headers['set-cookie'], undefined)
  t.ok(response1.body.startsWith('custom-'))

  const response2 = await fastify.inject({
    url: '/login',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.equal(response2.statusCode, 200)
  t.not(response2.headers['set-cookie'], undefined)

  const response3 = await fastify.inject({
    url: '/',
    headers: { Cookie: response2.headers['set-cookie'] }
  })
  t.equal(response3.statusCode, 200)
  t.ok(response3.body.startsWith('returningVisitor-'))
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
  t.teardown(() => fastify.close())

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
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.equal(response1.statusCode, 200)
  t.not(response1.headers['set-cookie'], undefined)
  t.ok(response1.body.startsWith('custom-'))

  const response2 = await fastify.inject({
    url: '/login',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.equal(response2.statusCode, 200)
  t.not(response2.headers['set-cookie'], undefined)

  const response3 = await fastify.inject({
    url: '/',
    headers: { Cookie: response2.headers['set-cookie'] }
  })
  t.equal(response3.statusCode, 200)
  t.ok(response3.body.startsWith('returningVisitor-'))
})

test('should reload the session', async (t) => {
  t.plan(4)
  const fastify = await buildFastify((request, reply) => {
    request.session.someData = 'some-data'
    t.equal(request.session.someData, 'some-data')

    request.session.reload((err) => {
      t.same(err, null)

      t.equal(request.session.someData, undefined)

      reply.send(200)
    })
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('should save the session', async (t) => {
  t.plan(6)
  const fastify = await buildFastify((request, reply) => {
    request.session.someData = 'some-data'
    t.equal(request.session.someData, 'some-data')

    request.session.save((err) => {
      t.same(err, null)

      t.equal(request.session.someData, 'some-data')

      // unlike previous test, here the session data remains after a save
      request.session.reload((err) => {
        t.same(err, null)

        t.equal(request.session.someData, 'some-data')

        reply.send(200)
      })
    })
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('destroy supports promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.resolves(request.session.destroy())

    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('destroy supports rejecting promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.rejects(request.session.destroy(), 'no can do')

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(null) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(new Error('no can do')) }
    }
  })
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  // 200 since we assert inline and swallow the error
  t.equal(response.statusCode, 200)
})

test('regenerate supports promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.resolves(request.session.regenerate())

    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('regenerate supports rejecting promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.rejects(request.session.regenerate(), 'no can do')

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(new Error('no can do')) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(null) }
    }
  })
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  // 200 since we assert inline and swallow the error
  t.equal(response.statusCode, 200)
})

test('reload supports promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.resolves(request.session.reload())

    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('reload supports rejecting promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.rejects(request.session.reload(), 'no can do')

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(null) },
      get (id, cb) { cb(new Error('no can do')) },
      destroy (id, cb) { cb(null) }
    }
  })
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  // 200 since we assert inline and swallow the error
  t.equal(response.statusCode, 200)
})

test('save supports promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.resolves(request.session.save())

    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  t.equal(response.statusCode, 200)
})

test('save supports rejecting promises', async t => {
  t.plan(2)
  const fastify = await buildFastify(async (request, reply) => {
    await t.rejects(request.session.save())

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(new Error('no can do')) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(null) }
    }
  })
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/'
  })

  // 200 since we assert inline and swallow the error
  t.equal(response.statusCode, 200)
})

test("clears cookie if not backed by a session, and there's nothing to save", async t => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: DEFAULT_COOKIE_VALUE }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'], 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
})

test("clearing cookie sets the domain if it's specified in the cookie options", async t => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    cookie: { domain: 'domain.test' }
  })
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: DEFAULT_COOKIE_VALUE }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'], 'sessionId=; Domain=domain.test; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
})

test('does not clear cookie if no session cookie in request', async t => {
  t.plan(2)
  const fastify = await buildFastify((request, reply) => {
    reply.send(200)
  }, DEFAULT_OPTIONS)
  t.teardown(() => fastify.close())

  const response = await fastify.inject({
    url: '/',
    headers: { cookie: 'someOtherCookie=foobar' }
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['set-cookie'], undefined)
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

  t.equal(response1.statusCode, 200)
  t.equal(setCount, 1)
  t.equal(typeof setCookieHeader1, 'string')

  const { sessionId } = fastify.parseCookie(setCookieHeader1)

  const response2 = await fastify.inject({ path: '/', headers: { cookie: `sessionId=${sessionId}` } })
  const setCookieHeader2 = response2.headers['set-cookie']

  t.equal(response2.statusCode, 200)
  // still only called once
  t.equal(setCount, 1)
  // no set-cookie
  t.equal(setCookieHeader2, undefined)
})

test('when rolling is false, only save session when it changes, but not if manually saved', async t => {
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

    t.equal(request.session.isModified(), true)

    // manually save the session
    await request.session.save()

    t.equal(request.session.isModified(), false)

    await reply.send(200)
  })

  const { statusCode, headers } = await fastify.inject('/')

  t.equal(statusCode, 200)
  // we manually saved the session, so it should be called once (not once for manual save and once in `onSend`)
  t.equal(setCount, 1)
  t.equal(typeof headers['set-cookie'], 'string')
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

  t.equal(response1.statusCode, 200)
  t.equal(setCount, 1)
  t.equal(typeof setCookieHeader1, 'string')

  const { sessionId } = fastify.parseCookie(setCookieHeader1)

  const response2 = await fastify.inject({ path: '/', headers: { cookie: `sessionId=${sessionId}` } })
  const setCookieHeader2 = response2.headers['set-cookie']

  t.equal(response2.statusCode, 200)
  t.equal(setCount, 2)
  t.equal(typeof setCookieHeader2, 'string')
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
  t.teardown(() => { fastify.close() })

  const response1 = await fastify.inject({
    url: '/'
  })
  t.equal(response1.statusCode, 200)
  await new Promise(resolve => setTimeout(resolve, 1))
  t.same(response1.json(), { expires: null })

  const response2 = await fastify.inject({
    url: '/',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.equal(response2.statusCode, 200)
  t.same(response2.json(), { expires: null })
})
