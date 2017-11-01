# fastify-session

[![Greenkeeper badge](https://badges.greenkeeper.io/SerayaEryn/fastify-session.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/SerayaEryn/fastify-session.svg?branch=master)](https://travis-ci.org/SerayaEryn/fastify-session)
[![Coverage Status](https://coveralls.io/repos/github/SerayaEryn/fastify-session/badge.svg?branch=master)](https://coveralls.io/github/SerayaEryn/fastify-session?branch=master)
[![NPM version](https://img.shields.io/npm/v/fastify-session.svg?style=flat)](https://www.npmjs.com/package/fastify-session)

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
app.register(fastifySession, {secret: 'a secret'});
```
## API
### session(fastify, options, next)
The session plugin accepts the following options. It decrotates the request with the `sessionStore` and adds a `session` object to the request.
#### options
##### secret (required) 
The secret used to sign the cookie.
##### cookieName (optional) 
The name of the session cookie. Defaults to `sessionId`.
##### cookie
The options object used to generate the `Set-Cookie` header of the session cookie. May have the following properties:
* `path` - The `Path` attribute. Defaults to `/` (the root path). 
* `maxAge` - A `number` in milliseconds that specifies the `Expires` attribute by adding the specified milliseconds to the current date.  If both `expires` and `maxAge` are set, then `expires` is used.
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

Defaults to a simple in memory store.

## License

[MIT](./LICENSE)
