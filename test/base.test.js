'use strict';

const t = require('tap');
const test = t.test;
const Fastify = require('fastify');
const request = require('request');
const fastifyCookie = require('fastify-cookie');
const fastifyPlugin = require('fastify-plugin');
const fastifySession = require('..');

test('should set session cookie on post without params', t => {
  t.plan(3);
  const fastify = Fastify();

  const options = {
    secret: 'geheim'
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.post('/test', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port + '/test',
      headers: {
        'content-type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 400);
    })
  });
});

test('register should fail if no secret is specified', t => {
  t.plan(1);
  const fastify = Fastify();

  const options = {}
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.ready((err) => {
    t.ok(err instanceof Error);
  })
});

test('should set session non secure cookie', t => {
  t.plan(6);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookie: {
      secure: false
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(!response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('sessionId'));
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
    })
  });
});

test('should set session non HttpOnly cookie', t => {
  t.plan(6);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookie: {
      httpOnly: false
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('sessionId'));
      t.ok(!response.headers['set-cookie'][0].includes('HttpOnly'));
    })
  });
});

test('should set session cookie with expires', t => {
  t.plan(7);
  const fastify = Fastify();
  const date = new Date();
  date.setTime(34214461000);
  const options = {
    secret: 'geheim',
    cookie: {
      expires: date
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      const splitCookieHeader = response.headers['set-cookie'][0].split('; ');
      t.strictEqual(splitCookieHeader[2], 'Expires=Mon, 01 Feb 1971 00:01:01 GMT');
      t.ok(splitCookieHeader[0].includes('sessionId'));
      t.strictEqual(splitCookieHeader[3], 'HttpOnly');
      t.strictEqual(splitCookieHeader[4], 'Secure');
    })
  });
});

test('should set session cookie with expires if maxAge', t => {
  t.plan(7);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookie: {
      maxAge: 42
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      const splitCookieHeader = response.headers['set-cookie'][0].split('; ');
      t.ok(splitCookieHeader[0].includes('sessionId'));
      t.ok(splitCookieHeader[2].includes('Expires'));
      t.strictEqual(splitCookieHeader[3], 'HttpOnly');
      t.strictEqual(splitCookieHeader[4], 'Secure');
    })
  });
});

test('should set session cookie with maxAge', t => {
  t.plan(7);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookie: {
      domain: 'localhost'
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(response.headers['set-cookie'][0].includes('Domain=localhost'));
      t.ok(response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('sessionId'));
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
    })
  });
});

test('should set session cookie with sameSite', t => {
  t.plan(7);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookie: {
      sameSite: true
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(response.headers['set-cookie'][0].includes('SameSite=Strict'));
      t.ok(response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('sessionId'));
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
    })
  });
});

test('should set session another path in cookie', t => {
  t.plan(7);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookie: {
      path: '/a/test/path'
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/a/test/path', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/a/test/path',
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(response.headers['set-cookie'][0].includes('/a/test/path'))
      t.ok(response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('sessionId'));
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
    })
  });
});


test('should set session cookie', t => {
  t.plan(11);
  const fastify = Fastify();

  const options = {
    secret: 'geheim'
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('sessionId'));
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
      fastify.server.unref();
      request({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port,
        headers: {
          'x-forwarded-proto': 'https'
        }
      }, (err, response, body) => {
        t.error(err);
        t.strictEqual(response.statusCode, 200);
        t.ok(response.headers['set-cookie'][0].includes('Secure'));
        t.ok(response.headers['set-cookie'][0].includes('sessionId'));
        t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
      });
    });
  });
});

test('should set session cookie using the specified cookie name', t => {
  t.plan(6);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookieName: 'anothername'
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('anothername'));
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
    })
  });
});

test('should set session cookie using the specified cookie name', t => {
  t.plan(6);
  const fastify = Fastify();

  const options = {
    secret: 'geheim'
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('SMB5v0wS8tpP-GEP-_h0Libil682NPf0', {
        expires: Date.now() + 900000
      }, (err) => {
        done(err)
      })
    });
    next()
  }, '>=0.30.2'));
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=SMB5v0wS8tpP-GEP-_h0Libil682NPf0.AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('sessionId'));
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
    })
  });
});

test('should set session.expires if maxAge', t => {
  t.plan(4);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookie: {
      maxAge: 42
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('SMB5v0wS8tpP-GEP-_h0Libil682NPf0', {
        expires: Date.now() + 900000
      }, (err) => {
        done(err)
      })
    });
    next()
  }, '>=0.30.2'));
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    t.ok(request.session.expires)
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=SMB5v0wS8tpP-GEP-_h0Libil682NPf0.AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg; Path=/; HttpOnly; Secure'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
    })
  });
});

test('should set new session cookie if expired', t => {
  t.plan(7);
  const fastify = Fastify();

  const options = {
    secret: 'geheim'
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('SMB5v0wS8tpP-GEP-_h0Libil682NPf0', {
        expires: Date.now() - 900000
      }, (err) => {
        done(err)
      })
    });
    next()
  }, '>=0.30.2'));
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=SMB5v0wS8tpP-GEP-_h0Libil682NPf0.AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      const splitCookieHeader = response.headers['set-cookie'][0].split('; ');
      t.notEqual(splitCookieHeader[0], 'sessionId=OAUmT62-fZV1ygZ_P3Z-iebJo5B9ka7a.m3GJovYzBT5DdXyLmJE7%2BlNDwRYAHIDU1MLUrFkkE8I');
      t.strictEqual(splitCookieHeader[1], 'Path=/');
      t.strictEqual(splitCookieHeader[2], 'HttpOnly');
      t.strictEqual(splitCookieHeader[3], 'Secure');
    })
  });
});

test('should return new session cookie if does not exist in store', t => {
  t.plan(7);
  const fastify = Fastify();

  const options = {
    secret: 'geheim'
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=SMB5v0wS8tpP-GEP-_h0Libil682NPf0.AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      const splitCookieHeader = response.headers['set-cookie'][0].split('; ');
      t.notEqual(splitCookieHeader[0], 'sessionId=OAUmT62-fZV1ygZ_P3Z-iebJo5B9ka7a.m3GJovYzBT5DdXyLmJE7%2BlNDwRYAHIDU1MLUrFkkE8I');
      t.strictEqual(splitCookieHeader[1], 'Path=/');
      t.strictEqual(splitCookieHeader[2], 'HttpOnly');
      t.strictEqual(splitCookieHeader[3], 'Secure');
    })
  });
});

test('should not set session cookie on invalid path', t => {
  t.plan(4);
  const fastify = Fastify();

  const options = {
    secret: 'geheim',
    cookie: {
      path: '/path/'
    }
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(response.headers['set-cookie'] === undefined);
    })
  });
});

test('should create new session if cookie contains invalid session', t => {
  t.plan(7);
  const fastify = Fastify();

  const options = {
    secret: 'geheim'
  }
  fastify.register(fastifyCookie);
  fastify.register(fastifyPlugin((fastify, opts, next) => {
    fastify.addHook('preHandler', (request, reply, done) => {
      request.sessionStore.set('SMB5v0wS8tpP-GEP-_h0Libil682NPf0', {
        expires: Date.now() + 900000
      }, (err) => {
        done(err)
      })
    });
    next()
  }, '>=0.30.2'));
  fastify.register(fastifySession, options);
  fastify.get('/', (request, reply) => {
    reply.send(200);
  })
  fastify.listen(0, err => {
    fastify.server.unref();
    t.error(err);
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'cookie': 'sessionId=SMB5v0wS8tpP-GdP-_h0Libil682NPf0.AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg; Path=/; HttpOnly; Secure',
        'x-forwarded-proto': 'https'
      }
    }, (err, response, body) => {
      t.error(err);
      t.strictEqual(response.statusCode, 200);
      t.ok(!response.headers['set-cookie'][0].includes('AAzZgRQddT1TKLkT3OZcnPsDiLKgV1uM1XHy2bIyqIg'));
      t.ok(response.headers['set-cookie'][0].includes('Secure'));
      t.ok(response.headers['set-cookie'][0].includes('sessionId'));
      t.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
    })
  });
});
