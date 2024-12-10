# @fastify/session

[![CI](https://github.com/fastify/session/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/fastify/session/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/@fastify/session.svg?style=flat)](https://www.npmjs.com/package/@fastify/session)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

A session plugin for [fastify](http://fastify.dev/).
Requires the [@fastify/cookie](https://github.com/fastify/fastify-cookie) plugin.

**NOTE:** This is the continuation of [fastify-session](https://github.com/SerayaEryn/fastify-session) which is unmaintained by now. All work credit till [`e201f7`](https://github.com/fastify/session/commit/e201f78fc9d7bd33c6f2e84988be7c8af4b5a8a3) commit goes to [SerayaEryn](https://github.com/SerayaEryn) and contributors.

## Install

```
npm i @fastify/session
```

## Usage

```js
const fastify = require('fastify');
const fastifySession = require('@fastify/session');
const fastifyCookie = require('@fastify/cookie');

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
The secret used to sign the cookie. Must be an array of strings or a string with a length of 32 or greater or a custom signer.

If an array, the first secret is used to sign new cookies and is the first to be checked for incoming cookies.
Further secrets in the array are used to check incoming cookies in the order specified.

For a custom signer see the documentation of [@fastify/cookie](https://github.com/fastify/fastify-cookie#custom-cookie-signer)

Note that the rest of the application may manipulate the array during its life cycle. This can be done by storing the array in a separate variable that is later used with mutating methods like unshift(), pop(), splice(), etc.
This can be used to rotate the signing secret at regular intervals. A secret should remain somewhere in the array as long as there are active sessions with cookies signed by it. Secrets management is left up to the rest of the application.
##### cookieName (optional)
The name of the session cookie. Defaults to `sessionId`.
##### cookiePrefix (optional)
Prefix for the value of the cookie. This is useful for compatibility with `express-session`, which prefixes all cookies with `"s:"`. Defaults to `""`.
##### cookie
The options object is used to generate the `Set-Cookie` header of the session cookie. May have the following properties:
* `path` - The `Path` attribute. Defaults to `/` (the root path).
* `maxAge` - A `number` in milliseconds that specifies the `Expires` attribute by adding the specified milliseconds to the current date. If both `expires` and `maxAge` are set, then `maxAge` is used.
* `httpOnly` - The `boolean` value of the `HttpOnly` attribute. Defaults to true.
* `secure` - The `boolean` value of the `Secure` attribute. Set this option to false when communicating over an unencrypted (HTTP) connection. Value can be set to `auto`; in this case, the `Secure` attribute will be set to false for an HTTP request. In the case of HTTPS, it will be set to true.  Defaults to true.
* `expires` - The expiration `date` used for the `Expires` attribute. If both `expires` and `maxAge` are set, then `maxAge` is used.
* `sameSite`- The `boolean` or `string` of the `SameSite` attribute. Using `Secure` mode with `auto` attribute will change the behavior of the `SameSite` attribute in `http` mode. The `SameSite` attribute will automatically be set to `Lax` with an `http` request. See this [link](https://www.chromium.org/updates/same-site).
* `domain` - The `Domain` attribute.
* `partitioned` (**experimental**) - The `boolean` value of the `Partitioned` attribute. Using the Partitioned attribute as part of Cookies Having Independent Partitioned State (CHIPS) to allow cross-site access with a separate cookie used per site. Defaults to false.

##### store
A session store. Needs the following methods:
* set(sessionId, session, callback)
* get(sessionId, callback)
* destroy(sessionId, callback)

Compatible to stores from [express-session](https://github.com/expressjs/session).

If you are terminating HTTPs at
the reverse proxy, you need to add the `trustProxy` setting to your fastify instance if you want to use secure cookies.

Defaults to a simple in-memory store.</br>
**Note**: The default store should not be used in a production environment because it will leak memory.

##### saveUninitialized (optional)
Save sessions to the store, even when they are new and not modified— defaults to `true`.
Setting this to `false` can save storage space and comply with the EU cookie law.

##### rolling (optional)
Forces the session identifier cookie to be set on every response. The expiration is reset to the original maxAge - effectively resetting the cookie lifetime. This is typically used in conjuction with short, non-session-length maxAge values to provide a quick expiration of the session data with reduced potential of session expiration occurring during ongoing server interactions. Defaults to true.

##### idGenerator(request) (optional)

Function used to generate new session IDs.
Custom implementation example:
```js
const uid = require('uid-safe').sync

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

Updates the `expires` property of the session's cookie.

#### Session#options(opts)

Updates default options for setCookie inside a route.

```js
fastify.post('/', (request, reply) => {
  request.session.set('data', request.body)
  // .options takes any parameter that you can pass to setCookie
  request.session.options({ maxAge: 60 * 60 }); // 3600 seconds => maxAge is always passed in seconds
  reply.send('hello world')
})
```

#### Session#regenerate([ignoreFields, ]callback)

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

You can pass an array of fields that should be kept when the session is regenerated

#### Session#reload(callback)

Reloads the session data from the store and re-populates the `request.session` object. If you do not pass a callback, a Promise will be returned.

#### Session#save(callback)

Save the session back to the store, replacing the contents on the store with the contents in memory. If you do not pass a callback, a Promise will be returned.

#### Session#get(key)

Gets a value from the session

#### Session#set(key, value)

Sets a value in the session

#### Session#isModified()

Whether the session has been modified from what was loaded from the store (or created)

#### Session#isSaved()

Whether the session (and any of its potential modifications) has persisted to the store

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
// Use module imports rather than commonjs' require for correct declaration merging in TypeScript.

// Wrong ❌:
// const fastifySession = require('@fastify/session');
// const fastifyCookie = require('@fastify/cookie');

// Correct ✔️:
import { fastifySession } from '@fastify/session';
import { fastifyCookie } from '@fastify/cookie';

// Extend fastify.session with your custom type.
declare module "fastify" {
    interface Session {
        user_id: string
        other_key: your_prefer_type
        id?: number
    }
}
```

When you think that the getter or setter is too strict.
You are allowed to use `any` types to loosen the check.

```ts
fastify.get('/', async function(request) {
  request.session.get<any>('not-exist')
  request.session.set<any>('not-exist', 'happy')
})
```

## License

[MIT](./LICENSE)
