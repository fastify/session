import fastify from 'fastify';
import cookie from 'fastify-cookie';
import session from '../../';

class EmptyStore {
  set(_sessionId: string, _session: any, _callback: Function) {}

  get(_sessionId: string, _callback: Function) {}

  destroy(_sessionId: string, _callback: Function) {}
}

const app = fastify();

app.register(cookie);
app.register(session, {
  secret: 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345',
  store: new EmptyStore(),
});

app.get('/', async (req) => {
  //@ts-expect-error
  req.sessionStore = null
});

app.listen(4000, '0.0.0.0', (_err, address) => {
  console.log(address);
});
