# fastify-session

[![Greenkeeper badge](https://badges.greenkeeper.io/SerayaEryn/fastify-session.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/SerayaEryn/fastify-session.svg?branch=master)](https://travis-ci.org/SerayaEryn/fastify-session)
[![Coverage Status](https://coveralls.io/repos/github/SerayaEryn/fastify-session/badge.svg?branch=master)](https://coveralls.io/github/SerayaEryn/fastify-session?branch=master)
[![NPM version](https://img.shields.io/npm/v/fastify-session.svg?style=flat)](https://www.npmjs.com/package/fastify-session)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

A session plugin for [fastify](http://fastify.io/). 
Requires the [fastify-cookie](https://github.com/fastify/fastify-cookie) plugin.

## Install

```
npm install fastify-session
```

## Usage

```js
const fastify = require('fastify');
const fastifySession = require('fastify-session');
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
The `sessionStore` decorator of the `request` allows to get, save and delete sessions.
```js
app.register(fastifySession, {secret: 'a secret with minimum length of 32 characters'});
app.addHook('preHandler', (request, reply, next) => {
  const session = request.session;
  request.sessionStore.destroy(session.sessionId, next);
})
```
## API
### session(fastify, options, next)
The session plugin accepts the following options. It decorates the request with the `sessionStore` and adds a `session` object to the request. The session data is stored server side using the configured session store. 
#### options
##### secret (required) 
The secret used to sign the cookie. Must have length 32 or greater.
##### cookieName (optional) 
The name of the session cookie. Defaults to `sessionId`.
##### cookie
The options object used to generate the `Set-Cookie` header of the session cookie. May have the following properties:
* `path` - The `Path` attribute. Defaults to `/` (the root path). 
* `maxAge` - A `number` in milliseconds that specifies the `Expires` attribute by adding the specified milliseconds to the current date. If both `expires` and `maxAge` are set, then `expires` is used.
* `httpOnly` - The `boolean` value of the `HttpOnly` attribute. Defaults to true.
* `secure` - The `boolean` value of the `Secure` attribute. Defaults to true.
* `expires` - The expiration `date` used for the `Expires` attribute. If both `expires` and `maxAge` are set, then `expires` is used.
* `sameSite`- The `boolean` or `string` of the `SameSite` attribute. 
* `domain` - The `Domain` attribute.
##### store
A session store. Needs the following methods: 
* set(sessionId, session, callback)
* get(sessionId, callback)
* destroy(sessionId, callback)

Compatible to stores from [express-session](https://github.com/expressjs/session).

Defaults to a simple in memory store.</br>
**Note**: The default store should not be used in a production environment because it will leak memory.

##### saveUninitialized (optional) 
Save sessions to the store, even when they are new and not modified. Defaults to `true`.
Setting this to true can be useful to save storage space or to comply with the EU cookie law.

## License

[MIT](./LICENSE)
