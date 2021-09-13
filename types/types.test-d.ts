import { expectType, expectError } from "tsd";

import session, { MemoryStore, Session } from "./types";
import fastify, {
  FastifyRequest,
  FastifyInstance,
  FastifyReply,
} from "fastify";

const app: FastifyInstance = fastify();
app.register(session);
app.register(session, { secret: "DizIzSecret" });
app.register(session, { secret: "DizIzSecret", rolling: true });
expectError(app.register(session, {}));

app.get("/", async (request, reply) => {
  expectType<FastifyRequest>(request);
  expectType<FastifyReply>(reply);
  expectType<Session>(request.session);
  expectType<Readonly<session.SessionStore>>(request.sessionStore);
});
