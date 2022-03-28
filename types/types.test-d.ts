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

const app: FastifyInstance = fastify();
app.register(plugin);
app.register(plugin, { secret: 'DizIzSecret' });
app.register(plugin, { secret: 'DizIzSecret', rolling: true });
app.register(plugin, {
  secret: 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345',
  rolling: false,
  cookie: {
    secure: false
  }
});
app.register(plugin, {
  secret: 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345',
  cookie: {
    secure: false
  }
});
app.register(plugin, {
  secret: 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345',
  store: new EmptyStore()
});
app.register(plugin, {
  secret: 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345',
  idGenerator: () => Date.now() + ''
});
app.register(plugin, {
  secret: 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345',
  idGenerator: (request) => `${request == undefined ? 'null' : request.ip}-${Date.now()}`
});
expectError(app.register(plugin, {}));

app.route({
  method: 'GET',
  url: '/',
  preHandler(req, _rep, next) {
    expectType<void>(req.session.destroy(next));
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
    expectType<void>(request.session.reload(() => {}));
    expectType<void>(request.session.destroy(() => {}));
    expectType<void>(request.session.regenerate(() => {}));
  }
});
