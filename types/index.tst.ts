import MongoStore from 'connect-mongo'
import RedisStore from 'connect-redis'
import fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type Session
} from 'fastify'
import Redis from 'ioredis'
import { expect } from 'tstyche'
import fastifySession, { type CookieOptions, MemoryStore, type SessionStore } from '..'

const plugin = fastifySession

class EmptyStore {
  set (_sessionId: string, _session: any, _callback: Function) {}

  get (_sessionId: string, _callback: Function) {}

  destroy (_sessionId: string, _callback: Function) {}
}

declare module 'fastify' {
  interface Session {
    user?: {
      id: number;
    };
    foo: string
  }
}

expect(plugin.Store).type.toBe<SessionStore>()
expect(plugin.MemoryStore).type.toBe<SessionStore>()

const secret = 'ABCDEFGHIJKLNMOPQRSTUVWXYZ012345'

const app: FastifyInstance = fastify()
app.register(plugin, { secret: 'DizIzSecret' })
app.register(plugin, { secret: 'DizIzSecret', rolling: true })
app.register(plugin, {
  secret,
  rolling: false,
  cookie: {
    secure: false
  }
})
app.register(plugin, {
  secret,
  cookie: {
    maxAge: 1000,
    secure: 'auto'
  }
})

const cookieMaxAge: CookieOptions = {}

expect(cookieMaxAge.maxAge).type.toBeAssignableTo<number | undefined>()

app.register(plugin, {
  secret,
  store: new EmptyStore() as any
})
app.register(plugin, {
  secret,
  store: new RedisStore({ client: new Redis() })
})
app.register(plugin, {
  secret,
  store: MongoStore.create({ mongoUrl: 'mongodb://connection-string' })
})
app.register(plugin, {
  secret,
  store: new MemoryStore(new Map<string, Session>())
})
app.register(plugin, {
  secret,
  idGenerator: () => Date.now() + ''
})
app.register(plugin, {
  secret,
})
app.register(plugin, {
  secret,
  idGenerator: (request) => `${request === undefined ? 'null' : request.ip}-${Date.now()}`
})

// @ts-expect-error!
app.register(plugin)
// @ts-expect-error!
app.register(plugin, {})

// @ts-expect-error!
app.decryptSession<string>('sessionId', {}, () => ({}))
app.decryptSession<{ hello: 'world' }>('sessionId', { hello: 'world' }, () => ({}))
app.decryptSession<{ hello: 'world' }>('sessionId', { hello: 'world' }, { domain: '/' }, () => ({}))
app.decryptSession('sessionId', {}, () => ({}))
app.decryptSession('sessionId', {}, { domain: '/' }, () => ({}))

app.route({
  method: 'GET',
  url: '/',
  preHandler (req, _rep, next) {
    expect(req.session.destroy(next)).type.toBe<void>()
    expect(req.session.destroy()).type.toBe<Promise<void>>()
  },
  async handler (request, reply) {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(request.sessionStore).type.toBeAssignableTo<Readonly<SessionStore>>()

    // @ts-expect-error!
    request.sessionStore = null
    // @ts-expect-error!
    request.session.doesNotExist()

    expect(request.session.user).type.toBe<{ id: number } | undefined>()

    request.sessionStore.set('session-set-test', request.session, () => {})
    request.sessionStore.get('', (err, session) => {
      const store = new MemoryStore()
      if (session) store.set('session-set-test', session, () => {})
      expect(err).type.toBe<any>()
      expect(session).type.toBe<Session | null | undefined>()
      expect(session?.user).type.toBe<{ id: number } | undefined>()
    })

    expect(request.session.set('foo', 'bar')).type.toBe<void>()
    expect(request.session.get('foo')).type.toBe<string | undefined>()
    expect(request.session.touch()).type.toBe<void>()
    expect(request.session.isModified()).type.toBe<boolean>()
    expect(request.session.isSaved()).type.toBe<boolean>()
    expect(request.session.reload(() => {})).type.toBe<void>()
    expect(request.session.destroy(() => {})).type.toBe<void>()
    expect(request.session.regenerate(() => {})).type.toBe<void>()
    expect(request.session.regenerate(['foo'], () => {})).type.toBe<void>()
    expect(request.session.save(() => {})).type.toBe<void>()
    expect(request.session.reload()).type.toBe<Promise<void>>()
    expect(request.session.destroy()).type.toBe<Promise<void>>()
    expect(request.session.regenerate()).type.toBe<Promise<void>>()
    expect(request.session.regenerate(['foo'])).type.toBe<Promise<void>>()
    expect(request.session.save()).type.toBe<Promise<void>>()

    // @ts-expect-error!
    request.session.options({ keyNotInCookieOptions: true })
    // @ts-expect-error!
    request.session.options({ signed: true })

    expect(request.session.options({})).type.toBe<void>()
    expect(request.session.options({
      domain: 'example.com',
      expires: new Date(),
      httpOnly: true,
      maxAge: 1000,
      partitioned: true,
      path: '/',
      sameSite: 'lax',
      priority: 'low',
      secure: 'auto'
    })).type.toBe<void>()
  }
})

const customSigner = {
  sign: (value: string) => value,
  unsign: (_input: string) => ({
    valid: true,
    renew: false,
    value: null
  })
}

app.register(plugin, { secret: customSigner })

const app2 = fastify()
app2.register(fastifySession, { secret: 'DizIzSecret' })

app2.get('/', async function (request) {
  expect(request.session.get('foo')).type.toBeAssignableTo<string | undefined>()
  expect(request.session.get('foo')).type.not.toBeAssignableTo<number | undefined>()

  expect(request.session.set('foo', 'bar')).type.toBe<void>()

  // @ts-expect-error!
  request.session.set('foo', 2)

  expect(request.session.get('user')).type.toBe<undefined | { id: number }>()
  expect(request.session.set('user', { id: 2 })).type.toBeAssignableTo<any>()

  // @ts-expect-error!
  request.session.get('not exist')
  // @ts-expect-error!
  request.session.set('not exist', 'abc')

  expect(request.session.get<any>('not exist')).type.toBe<any>()
  expect(request.session.set<any>('not exist', 'abc')).type.toBeAssignableTo<any>()
})
