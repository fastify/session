'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const request = require('request')
const fastifyCookie = require('fastify-cookie')
const fastifyPlugin = require('fastify-plugin')
const fastifySession = require('../lib/fastifySession')

test('should set session cookie on post without params', t => {
  t.plan(3)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.post('/test', (request, reply) => {
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port + '/test',
      headers: {
        'content-type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
    })
  })
})

test('should set session cookie', t => {
  t.plan(11)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
      fastify.server.unref()
      request({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port,
        headers: {
          'x-forwarded-proto': 'https'
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.ok(response.headers['set-cookie'][0].includes('Secure'))
        t.ok(response.headers['set-cookie'][0].includes('sessionId'))
        t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
      })
    })
  })
})

test('should set session cookie using the specified cookie name', t => {
  t.plan(6)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookieName: 'anothername'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('anothername'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should set session cookie using the specified cookie name', t => {
  t.plan(6)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        expires: Date.now() + 900000,
        sessionId: 'Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN',
        cookie: {
          secure: true,
          httpOnly: true,
          path: '/'
        }
      }, (err) => {
        done(err)
      })
    })
    next()
  }, '>=0.30.2'))
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should set session.expires if maxAge', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      maxAge: 42
    }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        expires: Date.now() + 900000
      }, (err) => {
        done(err)
      })
    })
    next()
  }, '>=0.30.2'))
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    t.ok(request.session.expires)
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})

test('should set new session cookie if expired', t => {
  t.plan(7)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        expires: Date.now() - 900000
      }, (err) => {
        done(err)
      })
    })
    next()
  }, '>=0.30.2'))
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      const splitCookieHeader = response.headers['set-cookie'][0].split('; ')
      t.notEqual(splitCookieHeader[0], 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE')
      t.strictEqual(splitCookieHeader[1], 'Path=/')
      t.strictEqual(splitCookieHeader[2], 'HttpOnly')
      t.strictEqual(splitCookieHeader[3], 'Secure')
    })
  })
})

test('should return new session cookie if does not exist in store', t => {
  t.plan(7)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      const splitCookieHeader = response.headers['set-cookie'][0].split('; ')
      t.notEqual(splitCookieHeader[0], 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXU9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE')
      t.strictEqual(splitCookieHeader[1], 'Path=/')
      t.strictEqual(splitCookieHeader[2], 'HttpOnly')
      t.strictEqual(splitCookieHeader[3], 'Secure')
    })
  })
})

test('should not set session cookie on invalid path', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      path: '/path/'
    }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'] === undefined)
    })
  })
})

test('should create new session if cookie contains invalid session', t => {
  t.plan(7)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN', {
        expires: Date.now() + 900000
      }, (err) => {
        done(err)
      })
    })
    next()
  }, '>=0.30.2'))
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=Qk_XT2K7-clT-x1tVvoY6tIQ83iP72KN.B7fUDYXx9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(!response.headers['set-cookie'][0].includes('B7fUDYXx9fXF9pNuL3qm4NVmSduLJ6kzCOPh5JhHGoE'))
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should not set session cookie if no data in session and saveUninitialized is false', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    saveUninitialized: false
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'] === undefined)
    })
  })
})
