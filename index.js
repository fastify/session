'use strict';

const fastifyPlugin = require('fastify-plugin');
const uid = require('uid-safe').sync;
const cookieSignature = require('cookie-signature');
const Store = require('./lib/store');

function session(fastify, opts, next) {
  fastify.addHook('preHandler', handleSession);
  fastify.addHook('onSend', saveSession);

  const store = opts.store || new Store();
  fastify.decorateRequest('sessionStore', store);
  const cookieName = opts.cookieName || 'sessionId';
  const secret = opts.secret;
  const cookieOpts = opts.cookie || {};

  if (!secret) {
    next(new Error('the secret option is required!'));
    return;
  }

  function handleSession(request, reply, done) {
    const url = request.req.url;
    if (url.indexOf(cookieOpts.path || '/') !== 0) {
      done();
      return;
    }
    let sessionId = request.cookies[cookieName];
    if (!sessionId) {
      newSession(secret, request, reply, done);
    } else {
      const decryptedSessionId = cookieSignature.unsign(sessionId, secret);
      if (decryptedSessionId === false) {
        newSession(secret, request, reply, done);
      } else {
        store.get(decryptedSessionId, (err, session) => {
          if (err) {
            done(err);
            return;
          }
          if(!session) {
            newSession(secret, request, reply, done);
            return;
          }
          if (session && session.expires && session.expires <= Date.now()) {
            store.destroy(sessionId, getDestroyCallback(secret, request, reply, done));
            return;
          }
          if (cookieOpts.maxAge) {
            session.expires = Date.now() + cookieOpts.maxAge;
          }
          request.session = session;
          done();
        });
      }
    }
  }

  function getDestroyCallback(secret, request, reply, done) {
    return function destroyCallback(err) {
      if (err) {
        done(err);
        return;
      }
      newSession(secret, request, reply, done);
    }
  }

  function newSession(secret, request, reply, done) {
    const sessionId = uid(24);
    const encryptedSessionId = cookieSignature.sign(sessionId, secret);
    let expires = null;
    if (cookieOpts.maxAge) {
      expires = Date.now() + cookieOpts.maxAge;
    }
    const session = new Session(sessionId, encryptedSessionId, {}, expires);
    request.session = session;
    done();
  }

  function saveSession(request, reply, payload, done) {
    const session = request.session;
    if (!session) {
      done();
      return;
    }
    store.set(session.sessionId, session, (err) => {
      if (err) {
        done(err);
        return;
      }
      const cookieOptions = getCookieOptions();
      reply.setCookie(cookieName, session.encryptedSessionId, cookieOptions);
      done();
    });
  }

  function getCookieOptions() {
    return {
      path: cookieOpts.path || '/',
      httpOnly: cookieOpts.httpOnly !== undefined ? cookieOpts.httpOnly : true,
      secure: cookieOpts.secure !== undefined ? cookieOpts.secure : true,
      expires: getExpires(cookieOpts),
      sameSite: cookieOpts.sameSite || null,
      domain: cookieOpts.domain || null
    };
  }

  next();
}

function getExpires(cookieOpts) {
  let expires = null;
  if (cookieOpts.expires) {
    expires = cookieOpts.expires;
  } else if(cookieOpts.maxAge) {
    expires = new Date(Date.now() + cookieOpts.maxAge);
  }
  return expires;
}

class Session {
  constructor(sessionId, encryptedSessionId, sessionData, expires) {
    this.sessionId = sessionId;
    this.encryptedSessionId = encryptedSessionId;
    this.sessionData = sessionData;
    this.expires = expires;
  }
}

exports = module.exports = fastifyPlugin(session, ">=0.34.0");
