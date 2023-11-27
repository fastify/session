import MongoStore from 'connect-mongo';
import RedisStore from 'connect-redis';
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  Session
} from 'fastify';
import Redis from 'ioredis';
import { expectAssignable, expectError, expectType } from 'tsd';
import { MemoryStore, SessionStore, default as fastifySession, default as plugin } from '..';

class EmptyStore {
  set(_sessionId: string, _session: any, _callback: Function) {}

  get(_sessionId: string, _callback: Function) {}

  destroy(_sessionId: string, _callback: Function) {}
}

declare module 'fastify' {
  interface Session {
    user?: {
      id: number;
    };
    foo: string
  }
}

expectType<SessionStore>(plugin.Store)
expectType<SessionStore>(plugin.MemoryStore)

const secret = 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345';

const app: FastifyInstance = fastify();
app.register(plugin);
app.register(plugin, { secret: 'DizIzSecret' });
app.register(plugin, { secret: 'DizIzSecret', rolling: true });
app.register(plugin, {
  secret,
  rolling: false,
  cookie: {
    secure: false
  }
});
app.register(plugin, {
  secret,
  cookie: {
    secure: 'auto'
  }
});
app.register(plugin, {
  secret,
  store: new EmptyStore()
});
app.register(plugin, {
  secret,
  store: new RedisStore({ client: new Redis() })
});
app.register(plugin, {
  secret,
  store: MongoStore.create({ mongoUrl: 'mongodb://connection-string'})
});
app.register(plugin, {
  secret,
  store: new MemoryStore(new Map<string, Session>())
});
app.register(plugin, {
  secret,
  idGenerator: () => Date.now() + ''
});
app.register(plugin, {
  secret,
});
app.register(plugin, {
  secret,
  idGenerator: (request) => `${request == undefined ? 'null' : request.ip}-${Date.now()}`
});

expectError(app.register(plugin, {}));

expectError(app.decryptSession<string>('sessionId', {}, () => ({})))
app.decryptSession<{hello: 'world'}>('sessionId', { hello: 'world' }, () => ({}))
app.decryptSession<{hello: 'world'}>('sessionId', { hello: 'world' }, { domain: '/' }, () => ({}))
app.decryptSession('sessionId', {}, () => ({}))
app.decryptSession('sessionId', {}, { domain: '/' }, () => ({}))

app.route({
  method: 'GET',
  url: '/',
  preHandler(req, _rep, next) {
    expectType<void>(req.session.destroy(next));
    expectType<Promise<void>>(req.session.destroy());
  },
  async handler(request, reply) {
    expectType<FastifyRequest>(request);
    expectType<FastifyReply>(reply);
    expectType<Readonly<SessionStore>>(request.sessionStore);
    expectError((request.sessionStore = null));
    expectError(request.session.doesNotExist());
    expectType<{ id: number } | undefined>(request.session.user);
    request.sessionStore.set('session-set-test', request.session, () => {});
    request.sessionStore.get('', (err, session) => {
      var store = new MemoryStore();
      if (session) store.set('session-set-test', session, () => {});
      expectType<any>(err);
      expectType<Session | null | undefined>(session);
      expectType<{ id: number } | undefined>(session?.user);
    });
    expectType<void>(request.session.set('foo', 'bar'));
    expectType<string>(request.session.get<'foo', string>('foo'));
    expectType<void>(request.session.touch());
    expectType<boolean>(request.session.isModified());
    expectType<void>(request.session.reload(() => {}));
    expectType<void>(request.session.destroy(() => {}));
    expectType<void>(request.session.regenerate(() => {}));
    expectType<void>(request.session.regenerate(['foo'], () => {}));
    expectType<void>(request.session.save(() => {}));
    expectType<Promise<void>>(request.session.reload());
    expectType<Promise<void>>(request.session.destroy());
    expectType<Promise<void>>(request.session.regenerate());
    expectType<Promise<void>>(request.session.regenerate(['foo']));
    expectType<Promise<void>>(request.session.save());
  }
});

const customSigner = {
  sign: (value: string) => value,
  unsign: (input: string) => ({
    valid: true,
    renew: false,
    value: null
  })
};

app.register(plugin, { secret: customSigner });

const app2 = fastify()
app2.register(fastifySession)

app2.get('/', async function(request) {
  expectType<undefined | { id: number }>(request.session.get('user'))
  expectAssignable(request.session.set('user', { id: 2 }))

  expectError(request.session.get('not exist'))
  expectError(request.session.set('not exist', 'abc'))

  expectType<'bar'>(request.session.get<any, 'bar'>('not exist'))
  expectAssignable(request.session.set<any, string>('not exist', 'abc'))
})