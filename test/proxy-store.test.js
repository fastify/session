'use strict'

const test = require('ava')
const MemoryStore = require('../lib/store')
const createProxyStore = require('../lib/proxy-store')

test('should work with callbacks for `get`, `set`, `destroy', async (t) => {
  t.plan(6)
  const store = new MemoryStore()
  const proxyStore = createProxyStore(store)
  await new Promise(resolve => {
    proxyStore.set('one', { foo: 1 }, (err) => {
      t.falsy(err)
      proxyStore.get('one', (err, data) => {
        t.falsy(err)
        t.deepEqual(data, { foo: 1 })
        proxyStore.destroy('one', (err) => {
          t.falsy(err)
          proxyStore.get('one', (err, data) => {
            t.falsy(err)
            t.falsy(data)
            resolve()
          })
        })
      })
    })
  })
})

test('should work with promise api for `get`, `set`, `destroy`', async (t) => {
  t.plan(2)
  const store = new MemoryStore()
  const proxyStore = createProxyStore(store)
  await proxyStore.set('one', { foo: 1 })
  const data = await proxyStore.get('one')
  t.deepEqual(data, { foo: 1 })
  await proxyStore.destroy('one')
  const empty = await proxyStore.get('one')
  t.falsy(empty)
})

test('should reject promise if callback argument is not used', async (t) => {
  t.plan(3)
  class ErrorStore {
    get (sessionId, callback) {
      callback(new Error('ErrorStore#get'), null)
    }

    set (sessionId, session, callback) {
      callback(new Error('ErrorStore#set'))
    }

    destroy (sessionId, callback) {
      callback(new Error('ErrorStore#destroy'))
    }
  }
  const store = new ErrorStore()
  const proxyStore = createProxyStore(store)
  try {
    await proxyStore.get('id')
    t.fail('expect promise rejection with no callback argument')
  } catch (err) {
    t.true(err instanceof Error)
  }
  try {
    await proxyStore.set('id', { foo: 1 })
    t.fail('expect promise rejection with no callback argument')
  } catch (err) {
    t.true(err instanceof Error)
  }
  try {
    await proxyStore.destroy('id')
    t.fail('expect promise rejection with no callback argument')
  } catch (err) {
    t.true(err instanceof Error)
  }
})

test('should not reject promise if callback is passed', async (t) => {
  t.plan(4)
  class ErrorStore {
    get (sessionId, callback) {
      callback(new Error('ErrorStore#get'), null)
    }

    set (sessionId, session, callback) {
      callback(new Error('ErrorStore#set'))
    }

    destroy (sessionId, callback) {
      callback(new Error('ErrorStore#destroy'))
    }
  }
  const store = new ErrorStore()
  const proxyStore = createProxyStore(store)
  try {
    await proxyStore.get('id', (err, data) => {
      t.true(err instanceof Error)
      t.falsy(data)
    })
  } catch (err) {
    t.fail('unexpected promise rejection with callback argument passed')
  }
  try {
    await proxyStore.set('id', { foo: 1 }, (err) => {
      t.true(err instanceof Error)
    })
  } catch (err) {
    t.fail('unexpected promise rejection with callback argument passed')
  }
  try {
    await proxyStore.destroy('id', (err) => {
      t.true(err instanceof Error)
    })
  } catch (err) {
    t.fail('unexpected promise rejection with callback argument passed')
  }
})

test('should not mutate store instance by monkey-patch methods', (t) => {
  t.plan(3)
  class Store {
    constructor () {
      this.originalMethods = { get: this.get, set: this.set, destroy: this.destroy }
    }

    get () {}
    set () {}
    destroy () {}
  }
  const store = new Store()
  const originalMethods = store.originalMethods
  createProxyStore(store)
  t.is(store.get, originalMethods.get)
  t.is(store.set, originalMethods.set)
  t.is(store.destroy, originalMethods.destroy)
})

test('should allow referencing store methods other than `get`, `set`, `destroy`', (t) => {
  t.plan(4)
  class Store {
    get () {}
    set () {}
    destroy () {}
    foo () {
      return 1
    }

    bar () {
      return this.foo() + 1
    }
  }
  const store = new Store()
  const proxyStore = createProxyStore(store)
  t.is(proxyStore.foo(), 1)
  t.is(proxyStore.bar(), 2)
  t.is(proxyStore.foo, store.foo)
  t.is(proxyStore.bar, store.bar)
})
