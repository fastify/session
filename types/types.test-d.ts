import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  Session
} from 'fastify';
import { expectError, expectType } from 'tsd';
import plugin from '..';

class EmptyStore {
  set(_sessionId: string, _session: any, _callback: Function) {}

  get(_sessionId: string, _callback: Function) {}

  destroy(_sessionId: string, _callback: Function) {}
}

declare module 'fastify' {
  interface Session {
    get<T>(key: string): T;
    set(key: string, value: unknown): void;
    user?: {
      id: number;
    };
  }
}

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
    secure: false
  }
});
app.register(plugin, {
  secret,
  store: new EmptyStore()
});
app.register(plugin, {
  secret,
  idGenerator: () => Date.now() + ''
});
app.register(plugin, {
  secret,
  idGenerator: (request) => `${request == undefined ? 'null' : request.ip}-${Date.now()}`
});
expectError(app.register(plugin, {}));

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
    expectType<Readonly<plugin.SessionStore>>(request.sessionStore);
    expectError((request.sessionStore = null));
    expectError(request.session.doesNotExist());
    expectType<{ id: number } | undefined>(request.session.user);
    request.sessionStore.set('session-set-test', request.session, () => {})
    request.sessionStore.get('', (err, session) => {
      expectType<Error | null>(err);
      expectType<Session>(session);
      expectType<{ id: number } | undefined>(session.user);
    });
    expectType<void>(request.session.set('foo', 'bar'));
    expectType<string>(request.session.get('foo'));
    expectType<void>(request.session.touch());
    expectType<boolean>(request.session.isModified());
    expectType<void>(request.session.reload(() => {}));
    expectType<void>(request.session.destroy(() => {}));
    expectType<void>(request.session.regenerate(() => {}));
    expectType<void>(request.session.save(() => {}));
    expectType<Promise<void>>(request.session.reload());
    expectType<Promise<void>>(request.session.destroy());
    expectType<Promise<void>>(request.session.regenerate());
    expectType<Promise<void>>(request.session.save());
  }
});
