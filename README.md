# @fastify/session

![CI](https://github.com/fastify/session/workflows/CI/badge.svg)
[![NPM version](https://img.shields.io/npm/v/@fastify/session.svg?style=flat)](https://www.npmjs.com/package/@fastify/session)
[![Known Vulnerabilities](https://snyk.io/test/github/fastify/session/badge.svg)](https://snyk.io/test/github/fastify/session)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

A session plugin for [fastify](http://fastify.io/).
Requires the [fastify-cookie](https://github.com/fastify/fastify-cookie) plugin.

**NOTE:** This is the continuation of [fastify-session](https://github.com/SerayaEryn/fastify-session) which is unmaintained by now. All work credit till [`e201f7`](https://github.com/fastify/session/commit/e201f78fc9d7bd33c6f2e84988be7c8af4b5a8a3) commit goes to [SerayaEryn](https://github.com/SerayaEryn) and contributors.

## Install

```
npm install @fastify/session
```

## Usage

```js
const fastify = require('fastify');
const fastifySession = require('@fastify/session');
const fastifyCookie = require('fastify-cookie');

const app = fastify();
app.register(fastifyCookie);
app.register(fastifySession, {secret: 'a secret with minimum length of 32 characters'});
```
Store data in the session by adding it to the `session` decorator at the `request`:
```js
app.register(fastifySession, {secret: 'a secret with minimum length of 32 characters'});
app.addHook('preHandler', (request, reply, next) => {
  request.session.user = {name: 'max'};
  next();
})
```
**NOTE**: For all unencrypted (HTTP) connections, you need to set the `secure` cookie option to `false`. See below for all cookie options and their details.
The `session` object has methods that allow you to get, save, reload and delete sessions.
```js
app.register(fastifySession, {secret: 'a secret with minimum length of 32 characters'});
app.addHook('preHandler', (request, reply, next) => {
  request.session.destroy(next);
})
```

## Examples

* [Authentication](https://github.com/fastify/example/tree/master/fastify-session-authentication)

## API
### session(fastify, options, next)
The session plugin accepts the following options. It decorates the request with the `sessionStore` and a `session` object. The session data is stored server-side using the configured session store.
#### options
##### secret (required)
The secret used to sign the cookie. Must be an array of strings or a string with a length of 32 or greater.

If an array, the first secret is used to sign new cookies and is the first to be checked for incoming cookies.
Further secrets in the array are used to check incoming cookies in the order specified.

Note that the rest of the application may manipulate the array during its life cycle. This can be done by storing the array in a separate variable that is later used with mutating methods like unshift(), pop(), splice(), etc.
This can be used to rotate the signing secret at regular intervals. A secret should remain somewhere in the array as long as there are active sessions with cookies signed by it. Secrets management is left up to the rest of the application.
##### cookieName (optional)
The name of the session cookie. Defaults to `sessionId`.
##### cookie
The options object is used to generate the `Set-Cookie` header of the session cookie. May have the following properties:
* `path` - The `Path` attribute. Defaults to `/` (the root path).
* `maxAge` - A `number` in milliseconds that specifies the `Expires` attribute by adding the specified milliseconds to the current date. If both `expires` and `maxAge` are set, then `maxAge` is used.
* `httpOnly` - The `boolean` value of the `HttpOnly` attribute. Defaults to true.
* `secure` - The `boolean` value of the `Secure` attribute. Set this option to false when communicating over an unencrypted (HTTP) connection. Value can be set to `auto`; in this case, the `Secure` attribute will be set to false for an HTTP request. In the case of HTTPS, it will be set to true.  Defaults to true.
* `expires` - The expiration `date` used for the `Expires` attribute. If both `expires` and `maxAge` are set, then `maxAge` is used.
* `sameSite`- The `boolean` or `string` of the `SameSite` attribute. Using `Secure` mode with `auto` attribute will change the behavior of the `SameSite` attribute in `http` mode. The `SameSite` attribute will automatically be set to `Lax` with an `http` request. See this [link](https://www.chromium.org/updates/same-site).
* `domain` - The `Domain` attribute.

##### store
A session store. Needs the following methods:
* set(sessionId, session, callback)
* get(sessionId, callback)
* destroy(sessionId, callback)

Compatible to stores from [express-session](https://github.com/expressjs/session).

Defaults to a simple in-memory store.</br>
**Note**: The default store should not be used in a production environment because it will leak memory.

##### saveUninitialized (optional)
Save sessions to the store, even when they are new and not modified— defaults to `true`.
Setting this to `false` can save storage space and comply with the EU cookie law.

##### idGenerator(request) (optional)

Function used to generate new session IDs. Defaults to [`uid(24)`](https://github.com/crypto-utils/uid-safe).
Custom implementation example:
```js
idGenerator: (request) => {
     if (request.session.returningVisitor) return `returningVisitor-${uid(24)}`
     else return uid(24)
}
```

#### request.session

Allows to access or modify the session data.

#### Session#destroy(callback)

Allows to destroy the session in the store. If you do not pass a callback, a Promise will be returned.

#### Session#touch()

Updates the `expires` property of the session.

#### Session#regenerate(callback)

Regenerates the session by generating a new `sessionId` and persist it to the store. If you do not pass a callback, a Promise will be returned.
```js
fastify.get('/regenerate', (request, reply, done) => {
  request.session.regenerate(error => {
    if (error) {
      done(error);
      return;
    }
    reply.send(request.session.sessionId);
  });
});
```

#### Session#reload(callback)

Reloads the session data from the store and re-populates the `request.session` object. If you do not pass a callback, a Promise will be returned.

#### Session#save(callback)

Save the session back to the store, replacing the contents on the store with the contents in memory. If you do not pass a callback, a Promise will be returned.

#### Session#get(key)

Gets a value from the session

#### Session#set(key, value)

Sets a value in the session

### fastify.decryptSession(sessionId, request, cookieOptions, next)
This plugin also decorates the fastify instance with `decryptSession` in case you want to decrypt the session manually.

```js
const { sessionId } = fastify.parseCookie(cookieHeader);
const request = {}
fastify.decryptSession(sessionId, request, () => {
  // request.session should be available here
})

// or decrypt with custom cookie options:
fastify.decryptSession(sessionId, request, { maxAge: 86400 }, () => {
  // ...
})
```

### Typescript support:
This plugin supports typescript, and you can extend fastify module to add your custom session type.

```ts
declare module "fastify" {
    interface Session {
        user_id: string
        other_key: your_prefer_type
        id?: number
    }
}
```

While this plugin can be used with express-session compatible stores, the type definitions of some stores might be tied to express-session, which means that casting to `any` might be required. For example:

```ts
import fastifySession from '@fastify/session'
import fastify from 'fastify'
import Redis from 'ioredis'
import connectRedis from 'connect-redis'

const RedisStore = connectRedis(fastifySession as any)
const redisClient = new Redis(redisConfig)

const server = fastify()
server.register(fastifySession, {
  store: new RedisStore({
    client: redisClient,
    // ... other options
  }) as any,
  // ... other options
})
```

## License

[MIT](./LICENSE)
