"use strict";

const test = require("tap").test;
const { buildFastify, DEFAULT_SECRET } = require("./util");
const { setTimeout } = require("node:timers/promises");

test("sessions should be deleted if expired", async (t) => {
  t.plan(5);

  const sessions = {};
  const options = {
    secret: DEFAULT_SECRET,
    store: {
      get(id, cb) {
        t.pass("session was restored");
        cb(null, sessions[id]);
      },
      set(id, session, cb) {
        sessions[id] = session;
        cb();
      },
      destroy(id, cb) {
        t.pass("expired session is destroyed");
        cb();
      },
    },
    cookie: { maxAge: 1000, secure: false },
  };

  const fastify = await buildFastify((request, reply) => {
    reply.send(200);
  }, options);
  t.teardown(() => {
    fastify.close();
  });

  let response;
  response = await fastify.inject({
    url: "/",
  });

  const initialSession = response.headers["set-cookie"]
    .split(" ")[0]
    .replace(";", "");
  t.ok(initialSession.startsWith("sessionId="));

  // Wait for the cookie to expire
  await setTimeout(2000);

  response = await fastify.inject({
    url: "/",
    headers: {
      Cookie: initialSession,
    },
  });

  const endingSession = response.headers["set-cookie"]
    .split(" ")[0]
    .replace(";", "");
  t.ok(endingSession.startsWith("sessionId="));

  t.not(initialSession, endingSession);
});
