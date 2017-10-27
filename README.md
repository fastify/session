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
## API
### session(fastify, options, next)
#### options
##### secret (required) 
The secret used for sign the cookie.

##### cookieName (optional) 
The name of the session cookie. Defaults to sessionId.

##### cookie
The options object for the session cookie. May have the following properties:
* `path`
* `maxAge`
* `httpOnly`,
* `secure`
* `expires`
* `sameSite`
* `domain`

##### store
A session store. Needs the following methods: 
* set(sessionId, session, callback)
* get(sessionId, callback)
Defaults to a simple in memory store.

## License

[MIT](./LICENSE)
