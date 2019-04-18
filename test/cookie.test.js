'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const request = require('request')
const fastifyCookie = require('fastify-cookie')
const fastifySession = require('../lib/fastifySession')

test('should set session cookie', t => {
  t.plan(6)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.addHook('onRequest', (request, reply, next) => {
    request.raw.connection.encrypted = true
    next()
  })
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
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should not set session cookie is request is not secure', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.addHook('onRequest', (request, reply, next) => {
    request.raw.connection.encrypted = false
    next()
  })
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
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.notOk(response.headers['set-cookie'])
    })
  })
})

test('should not set session cookie is request is not secure and x-forwarded-proto != https', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.addHook('onRequest', (request, reply, next) => {
    request.raw.connection.encrypted = false
    next()
  })
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
        'x-forwarded-proto': 'http'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.notOk(response.headers['set-cookie'])
    })
  })
})

test('should not set session cookie is request is not secure and x-forwarded-proto = https', t => {
  t.plan(4)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk'
  }
  fastify.addHook('onRequest', (request, reply, next) => {
    request.raw.connection.encrypted = false
    next()
  })
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
      t.ok(response.headers['set-cookie'])
    })
  })
})

test('session.cookie should have maxage', t => {
  t.plan(5)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      maxAge: 100000000,
      secure: false
    }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/', (request, reply) => {
    t.equals(request.session.cookie.maxAge, 100000000)
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'])
    })
  })
})

test('should set session cookie with expires if maxAge', t => {
  t.plan(7)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      maxAge: 42
    }
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
      const splitCookieHeader = response.headers['set-cookie'][0].split('; ')
      t.ok(splitCookieHeader[0].includes('sessionId'))
      t.ok(splitCookieHeader[2].includes('Expires'))
      t.strictEqual(splitCookieHeader[3], 'HttpOnly')
      t.strictEqual(splitCookieHeader[4], 'Secure')
    })
  })
})

test('should set session cookie with maxAge', t => {
  t.plan(7)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      domain: 'localhost'
    }
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
      t.ok(response.headers['set-cookie'][0].includes('Domain=localhost'))
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should set session cookie with sameSite', t => {
  t.plan(7)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      sameSite: true
    }
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
      t.ok(response.headers['set-cookie'][0].includes('SameSite=Strict'))
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should set session another path in cookie', t => {
  t.plan(7)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      path: '/a/test/path'
    }
  }
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, options)
  fastify.get('/a/test/path', (request, reply) => {
    request.session.test = {}
    reply.send(200)
  })
  fastify.listen(0, err => {
    fastify.server.unref()
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/a/test/path',
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(response.headers['set-cookie'][0].includes('/a/test/path'))
      t.ok(response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should set session cookie with expires', t => {
  t.plan(7)
  const fastify = Fastify()
  const date = new Date()
  date.setTime(34214461000)
  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      expires: date
    }
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
      const splitCookieHeader = response.headers['set-cookie'][0].split('; ')
      t.strictEqual(splitCookieHeader[2], 'Expires=Mon, 01 Feb 1971 00:01:01 GMT')
      t.ok(splitCookieHeader[0].includes('sessionId'))
      t.strictEqual(splitCookieHeader[3], 'HttpOnly')
      t.strictEqual(splitCookieHeader[4], 'Secure')
    })
  })
})

test('should set session non HttpOnly cookie', t => {
  t.plan(6)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      httpOnly: false
    }
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
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(!response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})

test('should set session non secure cookie', t => {
  t.plan(6)
  const fastify = Fastify()

  const options = {
    secret: 'cNaoPYAwF60HZJzkcNaoPYAwF60HZJzk',
    cookie: {
      secure: false
    }
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
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.ok(!response.headers['set-cookie'][0].includes('Secure'))
      t.ok(response.headers['set-cookie'][0].includes('sessionId'))
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'))
    })
  })
})
