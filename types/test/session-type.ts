import fastify from 'fastify';
import cookie from 'fastify-cookie';
import session from '../../';

declare module 'fastify' {
  interface Session {
    user?: {
      id: number;
    };
  }
}

const app = fastify();

app.register(cookie);
app.register(session, {
  secret: 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345',
  cookie: {
    secure: false,
  },
});

app.route({
  method: 'GET',
  url: '/login',
  async preHandler(req, _rep) {
    req.session.user = req.session.user || { id: Math.floor(Math.random() * 100000) };
  },
  async handler(_req, _rep) {
    return { status: 'ok' };
  },
});

app.route({
  method: 'GET',
  url: '/logout',
  preHandler(req, _rep, next) {
    req.destroySession(next);
  },
  async handler(_req, _rep) {
    return { status: 'ok' };
  },
});

app.route({
  method: 'GET',
  url: '/me',
  async preHandler(req, _rep) {
    if (!req.session.user) {
      throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
    }
  },
  async handler(req, _rep) {
    const user = req.session.user!;

    // @ts-expect-error
    req.session.doesNotExist();

    return { id: user.id };
  },
});

app.listen(4000, '0.0.0.0', (_err, address) => {
  console.log(address);
});
