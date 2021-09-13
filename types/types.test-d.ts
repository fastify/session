import { expectType, expectError } from "tsd";

import session, { MemoryStore, Session } from "./types";
import fastify, {
  FastifyRequest,
  FastifyInstance,
  FastifyReply,
} from "fastify";

class EmptyStore {
  set(_sessionId: string, _session: any, _callback: Function) {}

  get(_sessionId: string, _callback: Function) {}

  destroy(_sessionId: string, _callback: Function) {}
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
expectError(app.register(session, {}));

app.get("/", async (request, reply) => {
  expectType<FastifyRequest>(request);
  expectType<FastifyReply>(reply);
  expectType<Session>(request.session);
  expectType<Readonly<session.SessionStore>>(request.sessionStore);
  expectError((request.sessionStore = null));
  expectError(request.session.doesNotExist());
});
