'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const { setTimeout: sleep } = require('node:timers/promises')
const Fastify = require('fastify')
const fastifyCookie = require('@fastify/cookie')
const fastifySession = require('..')
const { MemoryStore } = require('../lib/store')
const { DEFAULT_SECRET } = require('./util')

async function waitFor (promise, message) {
  const controller = new AbortController()
  try {
    await Promise.race([
      promise,
      sleep(1000, undefined, { signal: controller.signal }).then(() => { throw new Error(message) })
    ])
  } finally {
    controller.abort()
  }
}

async function runLogoutRace (t, { rolling, modify, explicitSave, reload, regenerate }) {
  const sessions = new Map()
  const first = Fastify()
  const second = Fastify()
  let releaseHeldRequest
  let heldRequestStarted
  let saveError
  const heldRequest = new Promise(resolve => { releaseHeldRequest = resolve })
  const started = new Promise(resolve => { heldRequestStarted = resolve })
  const sessionOptions = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false },
    ...(rolling === undefined ? {} : { rolling })
  }

  t.after(async () => {
    releaseHeldRequest()
    await Promise.all([first.close(), second.close()])
  })

  await first.register(fastifyCookie)
  await first.register(fastifySession, {
    ...sessionOptions,
    store: new MemoryStore(sessions)
  })
  await second.register(fastifyCookie)
  await second.register(fastifySession, {
    ...sessionOptions,
    store: new MemoryStore(sessions)
  })

  first.post('/login', async request => {
    request.session.set('user', 'victim')
    return 'logged in'
  })
  first.get('/hold', async request => {
    heldRequestStarted()
    await heldRequest

    if (modify) {
      request.session.set('staleWrite', true)
    }

    if (explicitSave) {
      try {
        await request.session.save()
      } catch (error) {
        saveError = error
      }
    }

    if (reload) {
      try {
        await request.session.reload()
      } catch (error) {
        saveError = error
      }
    }

    if (regenerate) {
      try {
        await request.session.regenerate(['user'])
      } catch (error) {
        saveError = error
      }
    }

    return 'done'
  })
  second.post('/logout', async request => {
    await request.session.destroy()
    return 'logged out'
  })
  second.get('/me', async (request, reply) => {
    const user = request.session.get('user')
    return user ? { authenticated: user } : reply.code(401).send({ authenticated: null })
  })

  const login = await first.inject({ method: 'POST', url: '/login' })
  assert.strictEqual(login.statusCode, 200)
  const cookie = login.headers['set-cookie'].split(';', 1)[0]

  const pendingResponse = first.inject({
    method: 'GET',
    url: '/hold',
    headers: { cookie }
  })

  try {
    await waitFor(started, 'held request did not start')

    const logout = await second.inject({
      method: 'POST',
      url: '/logout',
      headers: { cookie }
    })
    assert.strictEqual(logout.statusCode, 200)
  } finally {
    releaseHeldRequest()
  }

  const completedResponse = await pendingResponse
  assert.strictEqual(completedResponse.statusCode, 200)

  const replay = await second.inject({
    method: 'GET',
    url: '/me',
    headers: { cookie }
  })
  assert.strictEqual(replay.statusCode, 401)
  assert.deepStrictEqual(replay.json(), { authenticated: null })

  return { completedResponse, saveError }
}

test('logout cannot be undone by an unchanged rolling request', async t => {
  const { completedResponse } = await runLogoutRace(t, {})

  assert.match(completedResponse.headers['set-cookie'], /^sessionId=;/)
})

test('logout cannot be undone by a modified non-rolling request', async t => {
  const { completedResponse } = await runLogoutRace(t, {
    rolling: false,
    modify: true
  })

  assert.match(completedResponse.headers['set-cookie'], /^sessionId=;/)
})

test('explicit save cannot recreate a destroyed session', async t => {
  const { saveError } = await runLogoutRace(t, {
    rolling: false,
    explicitSave: true
  })

  assert.strictEqual(saveError.code, 'ENOENT')
})

test('reload cannot recreate a destroyed session identifier', async t => {
  const { saveError } = await runLogoutRace(t, {
    rolling: false,
    reload: true
  })

  assert.strictEqual(saveError.code, 'ENOENT')
})

test('regenerate cannot preserve authentication after logout', async t => {
  const { saveError } = await runLogoutRace(t, {
    rolling: false,
    regenerate: true
  })

  assert.strictEqual(saveError.code, 'ENOENT')
})

test('reload cannot adopt a concurrently regenerated session', async t => {
  const sessions = new Map()
  const first = Fastify()
  const second = Fastify()
  let releaseReload
  let markReloadStarted
  let reloadError
  const reloadReleased = new Promise(resolve => { releaseReload = resolve })
  const reloadStarted = new Promise(resolve => { markReloadStarted = resolve })
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false }
  }

  t.after(async () => {
    releaseReload()
    await Promise.all([first.close(), second.close()])
  })

  await first.register(fastifyCookie)
  await first.register(fastifySession, {
    ...options,
    store: new MemoryStore(sessions)
  })
  await second.register(fastifyCookie)
  await second.register(fastifySession, {
    ...options,
    store: new MemoryStore(sessions)
  })

  first.post('/login', async request => {
    request.session.set('user', 'victim')
    return 'logged in'
  })
  first.get('/reload', async request => {
    markReloadStarted()
    await reloadReleased
    try {
      await request.session.reload()
    } catch (error) {
      reloadError = error
    }
    return 'done'
  })
  second.post('/regenerate', async request => {
    await request.session.regenerate(['user'])
    return 'regenerated'
  })
  second.get('/me', async (request, reply) => {
    const user = request.session.get('user')
    return user ? { authenticated: user } : reply.code(401).send({ authenticated: null })
  })

  const login = await first.inject({ method: 'POST', url: '/login' })
  const oldCookie = login.headers['set-cookie'].split(';', 1)[0]
  const pendingReload = first.inject({
    method: 'GET',
    url: '/reload',
    headers: { cookie: oldCookie }
  })

  try {
    await waitFor(reloadStarted, 'reload request did not start')
    const regenerate = await second.inject({
      method: 'POST',
      url: '/regenerate',
      headers: { cookie: oldCookie }
    })
    assert.strictEqual(regenerate.statusCode, 200)
    const newCookie = regenerate.headers['set-cookie'].split(';', 1)[0]

    releaseReload()
    const completedReload = await pendingReload
    assert.strictEqual(completedReload.statusCode, 200)
    assert.strictEqual(reloadError.code, 'ENOENT')

    const oldReplay = await second.inject({
      method: 'GET',
      url: '/me',
      headers: { cookie: oldCookie }
    })
    assert.strictEqual(oldReplay.statusCode, 401)

    const currentSession = await second.inject({
      method: 'GET',
      url: '/me',
      headers: { cookie: newCookie }
    })
    assert.strictEqual(currentSession.statusCode, 200)
  } finally {
    releaseReload()
  }
})

test('sessionStoreId can destroy a regenerated session directly', async t => {
  const app = Fastify()
  await app.register(fastifyCookie)
  await app.register(fastifySession, {
    secret: DEFAULT_SECRET,
    cookie: { secure: false }
  })
  t.after(() => app.close())

  app.post('/login', async request => {
    request.session.set('user', 'victim')
    return 'logged in'
  })
  app.post('/regenerate', async request => {
    await request.session.regenerate(['user'])
    return {
      sessionId: request.session.sessionId,
      sessionStoreId: request.session.sessionStoreId
    }
  })
  app.post('/destroy', async request => {
    await new Promise((resolve, reject) => {
      request.sessionStore.destroy(request.session.sessionStoreId, error => {
        if (error) reject(error)
        else resolve()
      })
    })
    return 'destroyed'
  })
  app.get('/me', async (request, reply) => {
    const user = request.session.get('user')
    return user ? { authenticated: user } : reply.code(401).send({ authenticated: null })
  })

  const login = await app.inject({ method: 'POST', url: '/login' })
  const oldCookie = login.headers['set-cookie'].split(';', 1)[0]
  const regenerate = await app.inject({
    method: 'POST',
    url: '/regenerate',
    headers: { cookie: oldCookie }
  })
  assert.strictEqual(regenerate.statusCode, 200)
  assert.notStrictEqual(regenerate.json().sessionId, regenerate.json().sessionStoreId)
  const newCookie = regenerate.headers['set-cookie'].split(';', 1)[0]

  const destroy = await app.inject({
    method: 'POST',
    url: '/destroy',
    headers: { cookie: newCookie }
  })
  assert.strictEqual(destroy.statusCode, 200)

  const replay = await app.inject({
    method: 'GET',
    url: '/me',
    headers: { cookie: newCookie }
  })
  assert.strictEqual(replay.statusCode, 401)
})

test('logout revokes a session that was concurrently regenerated first', async t => {
  const sessions = new Map()
  const first = Fastify()
  const second = Fastify()
  let releaseLogout
  let markLogoutStarted
  const logoutReleased = new Promise(resolve => { releaseLogout = resolve })
  const logoutStarted = new Promise(resolve => { markLogoutStarted = resolve })
  const options = {
    secret: DEFAULT_SECRET,
    cookie: { secure: false },
    store: new MemoryStore(sessions)
  }

  t.after(async () => {
    releaseLogout()
    await Promise.all([first.close(), second.close()])
  })

  await first.register(fastifyCookie)
  await first.register(fastifySession, options)
  await second.register(fastifyCookie)
  await second.register(fastifySession, {
    ...options,
    store: new MemoryStore(sessions)
  })

  first.post('/login', async request => {
    request.session.set('user', 'victim')
    return 'logged in'
  })
  first.post('/regenerate', async request => {
    await request.session.regenerate(['user'])
    return 'regenerated'
  })
  first.get('/me', async (request, reply) => {
    const user = request.session.get('user')
    return user ? { authenticated: user } : reply.code(401).send({ authenticated: null })
  })
  second.post('/logout', async request => {
    markLogoutStarted()
    await logoutReleased
    await request.session.destroy()
    return 'logged out'
  })

  const login = await first.inject({ method: 'POST', url: '/login' })
  const oldCookie = login.headers['set-cookie'].split(';', 1)[0]
  const pendingLogout = second.inject({
    method: 'POST',
    url: '/logout',
    headers: { cookie: oldCookie }
  })

  try {
    await waitFor(logoutStarted, 'logout request did not start')
    const regenerate = await first.inject({
      method: 'POST',
      url: '/regenerate',
      headers: { cookie: oldCookie }
    })
    assert.strictEqual(regenerate.statusCode, 200)
    const newCookie = regenerate.headers['set-cookie'].split(';', 1)[0]

    releaseLogout()
    const logout = await pendingLogout
    assert.strictEqual(logout.statusCode, 200)

    const replay = await first.inject({
      method: 'GET',
      url: '/me',
      headers: { cookie: newCookie }
    })
    assert.strictEqual(replay.statusCode, 401)
  } finally {
    releaseLogout()
  }
})
