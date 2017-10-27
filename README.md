# fastify-session

A session plugin for [fastify](http://fastify.io/) using the `preHandler` hook.
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
## Options
* `secret` (required) - 
* `cookieName` (optional) - the name of the session cookie. Defaults to sessionId.
* `cookie` - the options object for the session cookie. May have the properties `path`, `maxAge`, `httpOnly`, `secure`, `expires`, `sameSite` and `domain`.
* `store`- a session store. Needs the following methods: 
set(sessionId, session, callback)
get(sessionId, callback)

## License

[MIT License](./LICENSE)
