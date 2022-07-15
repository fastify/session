'use strict'

const test = require('ava')
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const sinon = require('sinon')
const fastifySession = require('..')
const cookieSignature = require('cookie-signature')
const { request, testServer, DEFAULT_OPTIONS, DEFAULT_COOKIE, DEFAULT_COOKIE_VALUE } = require('./util')

test('should add session object to request', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { statusCode } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
})

test('should destroy the session', async (t) => {
  t.plan(3)
  const port = await testServer((request, reply) => {
    request.session.destroy((err) => {
      t.falsy(err)
      t.is(request.session, null)
      reply.send(200)
    })
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should add session.encryptedSessionId object to request', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session.encryptedSessionId)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { statusCode } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
})

test('should add session.cookie object to request', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session.cookie)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { statusCode } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
})

test('should add session.expires object to request', async (t) => {
  t.plan(2)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { maxAge: 42 }
  }
  const port = await testServer((request, reply) => {
    t.truthy(request.session.expires)
    reply.send(200)
  }, options)

  const { statusCode } = await request(`http://localhost:${port}`)

  t.is(statusCode, 200)
})

test('should add session.sessionId object to request', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session.sessionId)
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should allow get/set methods for fetching/updating session values', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    request.session.set('foo', 'bar')
    t.is(request.session.get('foo'), 'bar')
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should use custom sessionId generator if available (without request)', async (t) => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    t.truthy(request.session.sessionId.startsWith('custom-'))
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

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should keep user data in session throughout the time', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: false }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.foo = 'bar'
    reply.send(200)
  })
  fastify.get('/check', (request, reply) => {
    t.true(request.session.foo === 'bar')
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  fastify.server.unref()

  const { response: response1 } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })

  t.is(response1.statusCode, 200)

  const { response: response2 } = await request({
    url: 'http://localhost:' + fastify.server.address().port + '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.is(response2.statusCode, 200)
})

test('should generate new sessionId', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
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
  fastify.server.unref()

  const { response: response1 } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })

  t.is(response1.statusCode, 200)

  const { response: response2 } = await request({
    url: 'http://localhost:' + fastify.server.address().port + '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })

  t.is(response2.statusCode, 200)
})

test('should decorate the server with decryptSession', async t => {
  t.plan(2)
  const fastify = Fastify()

  const options = { secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk' }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  t.truthy(await fastify.ready())
  t.truthy(fastify.decryptSession)
})

test('should decryptSession with custom request object', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.addHook('onRequest', (request, reply, done) => {
    request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
      testData: 'this is a test',
      expires: Date.now() + 1000,
      sessionId: 'Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN',
      cookie: { secure: true, httpOnly: true, path: '/' }
    }, done)
  })

  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  fastify.server.unref()

  const { statusCode } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })
  t.is(statusCode, 200)

  const { sessionId } = fastify.parseCookie(DEFAULT_COOKIE)
  const requestObj = {}
  fastify.decryptSession(sessionId, requestObj, () => {
    t.is(requestObj.session.cookie.maxAge, null)
    t.is(requestObj.session.sessionId, 'Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN')
    t.is(requestObj.session.testData, 'this is a test')
  })
})

test('should decryptSession with custom cookie options', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  fastify.server.unref()

  const { statusCode } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })
  t.is(statusCode, 200)

  const { sessionId } = fastify.parseCookie(DEFAULT_COOKIE)
  const requestObj = {}
  fastify.decryptSession(sessionId, requestObj, { maxAge: 86400 }, () => {
    t.is(requestObj.session.cookie.maxAge, 86400)
  })
})

test('should bubble up errors with destroy call if session expired', async (t) => {
  t.plan(2)
  const fastify = Fastify()
  const store = {
    set (id, data, cb) { cb(null) },
    get (id, cb) {
      cb(null, { expires: Date.now() - 1000, cookie: { expires: Date.now() - 1000 } })
    },
    destroy (id, cb) { cb(new Error('No can do')) }
  }

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    store,
    cookie: { secure: false }
  }

  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)

  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  await fastify.listen({ port: 0 })
  fastify.server.unref()

  const { statusCode, body } = await request({
    url: 'http://localhost:' + fastify.server.address().port,
    headers: { cookie: 'sessionId=_TuQsCBgxtHB3bu6wsRpTXfjqR5sK-q_.3mu5mErW+QI7w+Q0V2fZtrztSvqIpYgsnnC8LQf6ERY;' }
  })
  t.is(statusCode, 500)
  t.is(JSON.parse(body).message, 'No can do')
})

test('should not reset session cookie expiration if rolling is false', async (t) => {
  t.plan(3)

  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
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
  fastify.server.unref()

  const { response: response1, body: sessionExpires1 } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })
  t.is(response1.statusCode, 200)

  const { response: response2, body: sessionExpires2 } = await request({
    url: 'http://localhost:' + fastify.server.address().port + '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.is(response2.statusCode, 200)

  t.is(sessionExpires1, sessionExpires2)
})

test('should update the expires property of the session using Session#touch() even if rolling is false', async (t) => {
  t.plan(3)

  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    rolling: false,
    cookie: { secure: false, maxAge: 10000 }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.addHook('onRequest', (request, reply, done) => {
    request.session.touch()
    reply.send(request.session.expires)
    done()
  })

  fastify.get('/', (request, reply) => reply.send(200))
  fastify.get('/check', (request, reply) => reply.send(200))
  await fastify.listen({ port: 0 })
  fastify.server.unref()

  const { response: response1, body: sessionExpires1 } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })
  t.is(response1.statusCode, 200)

  const { response: response2, body: sessionExpires2 } = await request({
    url: 'http://localhost:' + fastify.server.address().port + '/check',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.is(response2.statusCode, 200)

  t.true(sessionExpires1 !== sessionExpires2)
})

test('should use custom sessionId generator if available (with request)', async (t) => {
  const fastify = Fastify()
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: { secure: false, maxAge: 10000 },
    idGenerator: (request) => {
      if (request.session?.returningVisitor) return `returningVisitor-${new Date().getTime()}`
      else return `custom-${new Date().getTime()}`
    }
  })

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
  fastify.server.unref()

  const { response: response1, body: sessionBody1 } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })
  t.is(response1.statusCode, 200)
  t.true(response1.headers['set-cookie'] !== undefined)
  t.true(sessionBody1.startsWith('custom-'))

  const { response: response2 } = await request({
    url: 'http://localhost:' + fastify.server.address().port + '/login',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.is(response2.statusCode, 200)
  t.true(response2.headers['set-cookie'] !== undefined)

  const { response: response3, body: sessionBody3 } = await request({
    url: 'http://localhost:' + fastify.server.address().port,
    headers: { Cookie: response2.headers['set-cookie'] }
  })
  t.is(response3.statusCode, 200)
  t.true(sessionBody3.startsWith('returningVisitor-'))
})

test('should use custom sessionId generator if available (with request and rolling false)', async (t) => {
  const fastify = Fastify()
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
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
  fastify.server.unref()

  const { response: response1, body: sessionBody1 } = await request({
    url: 'http://localhost:' + fastify.server.address().port
  })
  t.is(response1.statusCode, 200)
  t.true(response1.headers['set-cookie'] !== undefined)
  t.true(sessionBody1.startsWith('custom-'))

  const { response: response2 } = await request({
    url: 'http://localhost:' + fastify.server.address().port + '/login',
    headers: { Cookie: response1.headers['set-cookie'] }
  })
  t.is(response2.statusCode, 200)
  t.true(response2.headers['set-cookie'] !== undefined)

  const { response: response3, body: sessionBody3 } = await request({
    url: 'http://localhost:' + fastify.server.address().port,
    headers: { Cookie: response2.headers['set-cookie'] }
  })
  t.is(response3.statusCode, 200)
  t.true(sessionBody3.startsWith('returningVisitor-'))
})

test('should reload the session', async (t) => {
  t.plan(4)
  const port = await testServer((request, reply) => {
    request.session.someData = 'some-data'
    t.is(request.session.someData, 'some-data')

    request.session.reload((err) => {
      t.falsy(err)

      t.is(request.session.someData, undefined)

      reply.send(200)
    })
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('should save the session', async (t) => {
  t.plan(6)
  const port = await testServer((request, reply) => {
    request.session.someData = 'some-data'
    t.is(request.session.someData, 'some-data')

    request.session.save((err) => {
      t.falsy(err)

      t.is(request.session.someData, 'some-data')

      // unlike previous test, here the session data remains after a save
      request.session.reload((err) => {
        t.falsy(err)

        t.is(request.session.someData, 'some-data')

        reply.send(200)
      })
    })
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('destroy supports promises', async t => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    await t.notThrowsAsync(request.session.destroy())

    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('destroy supports rejecting promises', async t => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    await t.throwsAsync(request.session.destroy(), { message: 'no can do' })

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(null) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(new Error('no can do')) }
    }
  })

  const { response } = await request(`http://localhost:${port}`)

  // 200 since we assert inline and swallow the error
  t.is(response.statusCode, 200)
})

test('regenerate supports promises', async t => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    await t.notThrowsAsync(request.session.regenerate())

    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('regenerate supports rejecting promises', async t => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    await t.throwsAsync(request.session.regenerate(), { message: 'no can do' })

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(new Error('no can do')) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(null) }
    }
  })

  const { response } = await request(`http://localhost:${port}`)

  // 200 since we assert inline and swallow the error
  t.is(response.statusCode, 200)
})

test('reload supports promises', async t => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    await t.notThrowsAsync(request.session.reload())

    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('reload supports rejecting promises', async t => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    await t.throwsAsync(request.session.reload(), { message: 'no can do' })

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(null) },
      get (id, cb) { cb(new Error('no can do')) },
      destroy (id, cb) { cb(null) }
    }
  })

  const { response } = await request(`http://localhost:${port}`)

  // 200 since we assert inline and swallow the error
  t.is(response.statusCode, 200)
})

test('save supports promises', async t => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    await t.notThrowsAsync(request.session.save())

    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response } = await request(`http://localhost:${port}`)

  t.is(response.statusCode, 200)
})

test('save supports rejecting promises', async t => {
  t.plan(2)
  const port = await testServer(async (request, reply) => {
    await t.throwsAsync(request.session.save())

    reply.send(200)
  }, {
    ...DEFAULT_OPTIONS,
    store: {
      set (id, data, cb) { cb(new Error('no can do')) },
      get (id, cb) { cb(null) },
      destroy (id, cb) { cb(null) }
    }
  })

  const { response } = await request(`http://localhost:${port}`)

  // 200 since we assert inline and swallow the error
  t.is(response.statusCode, 200)
})

test("clears cookie if not backed by a session, and there's nothing to save", async t => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { cookie: DEFAULT_COOKIE_VALUE }
  })

  t.is(response.statusCode, 200)
  t.is(cookie, 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT')
})

test('does not clear cookie if no session cookie in request', async t => {
  t.plan(2)
  const port = await testServer((request, reply) => {
    reply.send(200)
  }, DEFAULT_OPTIONS)

  const { response, cookie } = await request({
    url: `http://localhost:${port}`,
    headers: { cookie: 'someOtherCookie=foobar' }
  })

  t.is(response.statusCode, 200)
  t.is(cookie, undefined)
})

test('only save session when it changes', async t => {
  t.plan(6)
  const setStub = sinon.stub()
  const store = new Map()

  const fastify = Fastify()
  fastify.register(fastifyCookie)

  fastify.register(fastifySession, {
    ...DEFAULT_OPTIONS,
    saveUninitialized: false,
    cookie: { secure: false },
    store: {
      set (id, data, cb) {
        setStub()
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

  const { statusCode: statusCode1, headers: headers1 } = await fastify.inject('/')
  const setCookieHeader1 = headers1['set-cookie']

  t.is(statusCode1, 200)
  t.is(setStub.callCount, 1)
  t.is(typeof setCookieHeader1, 'string')

  const { sessionId } = fastify.parseCookie(setCookieHeader1)

  const { statusCode: statusCode2, headers: headers2 } = await fastify.inject({ path: '/', headers: { cookie: `sessionId=${sessionId}` } })
  const setCookieHeader2 = headers2['set-cookie']

  t.is(statusCode2, 200)
  // still only called once
  t.is(setStub.callCount, 1)
  // no set-cookie
  t.is(setCookieHeader2, undefined)
})

test('when unsignSignedCookie is true sessions should still be managed correctly', async t => {
  const store = new Map()
  const cookieSignKey = 'some-key'
  const options = {
    ...DEFAULT_OPTIONS,
    unsignSignedCookie: true,
    cookie: { secure: false, signed: false },
    store: {
      set (id, data, cb) {
        store.set(id, data)
        cb(null)
      },
      get (id, cb) { cb(null, store.get(id)) },
      destroy (id, cb) {
        store.delete(id)
        cb(null)
      }
    }
  }

  const runTestScenario = async (cookieSigned) => {
    options.cookie.signed = cookieSigned

    let encryptedSessionId = null

    const fastify = Fastify()
    fastify.register(fastifyCookie, { secret: cookieSignKey })
    fastify.register(fastifySession, options)
    fastify.get('/', (request, reply) => {
      encryptedSessionId = encryptedSessionId || request.session.encryptedSessionId
      reply.send(200)
    })

    const {
      statusCode: statusCode1,
      headers: {
        'set-cookie': cookie1
      }
    } = await fastify.inject('/')
    t.truthy(cookie1)
    t.is(statusCode1, 200)

    const { sessionId: sessionId1 } = fastify.parseCookie(cookie1)
    t.is(sessionId1, encryptedSessionId)

    const sessionId = cookieSigned
      ? cookieSignature.sign(sessionId1, cookieSignKey)
      : sessionId1
    const cookie = `sessionId=${sessionId};`
    const {
      statusCode: statusCode2,
      headers: {
        'set-cookie': cookie2
      }
    } = await fastify.inject({
      path: '/',
      headers: { cookie }
    })
    t.is(statusCode2, 200)
    t.truthy(cookie2)

    const { sessionId: sessionId2 } = fastify.parseCookie(cookie2)
    t.is(sessionId2, encryptedSessionId)
  }

  await runTestScenario(false)
  await runTestScenario(true)
})
