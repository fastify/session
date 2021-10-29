import { expectType, expectError } from "tsd";

import session from "./types";
import fastify, {
  FastifyRequest,
  FastifyInstance,
  FastifyReply,
  Session
} from "fastify";

class EmptyStore {
  set(_sessionId: string, _session: any, _callback: Function) {}

  get(_sessionId: string, _callback: Function) {}

  destroy(_sessionId: string, _callback: Function) {}
}

declare module "fastify" {
  interface Session {
    user?: {
      id: number;
    };
  }
}

const app: FastifyInstance = fastify();
app.register(session);
app.register(session, { secret: "DizIzSecret" });
app.register(session, { secret: "DizIzSecret", rolling: true });
app.register(session, {
  secret: "ABCDEFGHIJKLNMOPQRSTUVWXYZ012345",
  rolling: false,
  cookie: {
    secure: false,
  },
});
app.register(session, {
  secret: "ABCDEFGHIJKLNMOPQRSTUVWXYZ012345",
  cookie: {
    secure: false,
  },
});
app.register(session, {
  secret: "ABCDEFGHIJKLNMOPQRSTUVWXYZ012345",
  store: new EmptyStore(),
});
app.register(session, {
  secret: "ABCDEFGHIJKLNMOPQRSTUVWXYZ012345",
  idGenerator: () => Date.now()+"",
});
expectError(app.register(session, {}));

app.route({
  method: "GET",
  url: "/",
  preHandler(req, _rep, next) {
    req.destroySession(next);
    req.destroySession().then(() => {})
  },
  async handler(request, reply) {
    expectType<FastifyRequest>(request);
    expectType<FastifyReply>(reply);
    expectType<Readonly<session.SessionStore>>(request.sessionStore);
    expectError((request.sessionStore = null));
    expectError(request.session.doesNotExist());
    expectType<{ id: number } | undefined>(request.session.user);
    request.sessionStore.get('', (err, session) => {
      expectType<Error | undefined>(err)
      expectType<Session | undefined>(session)
      expectType<{ id: number } | undefined>(session?.user)
    })
  },
});
