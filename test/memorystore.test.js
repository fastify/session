'use strict'

const test = require('node:test')
const { MemoryStore } = require('../lib/store')
const { EventEmitter } = require('node:stream')

test('MemoryStore.constructor: created MemoryStore should be an EventEmitter', (t) => {
  t.plan(2)

  const store = new MemoryStore()

  t.assert.ok(store instanceof EventEmitter)
  store.on('test', () => t.assert.ok(true))
  store.emit('test')
})

test('MemoryStore.constructor: should accept a Map as internal store', t => {
  t.plan(1)

  const internalStore = new Map()

  const store = new MemoryStore(internalStore)

  t.assert.strictEqual(store.store, internalStore)
})

test('MemoryStore.set: should successfully set a value to sessionId ', t => {
  t.plan(4)

  const internalStore = new Map()

  t.assert.strictEqual(internalStore.size, 0)

  const store = new MemoryStore(internalStore)
  store.set('someId', { key: 'value' }, () => {
    t.assert.strictEqual(internalStore.size, 1)
    t.assert.strictEqual(internalStore.has('someId'), true)
    t.assert.deepStrictEqual(internalStore.get('someId'), { key: 'value' })
  })
})

test('MemoryStore.get: should successfully get a value for a valid sessionId ', t => {
  t.plan(1)

  const internalStore = new Map()
  internalStore.set('someId', { key: 'value' })

  const store = new MemoryStore(internalStore)
  store.get('someId', (_err, value) => {
    t.assert.deepStrictEqual(value, { key: 'value' })
  })
})

test('MemoryStore.get: should return undefined for an invalid sessionId ', t => {
  t.plan(1)

  const internalStore = new Map()
  internalStore.set('someId', { key: 'value' })

  const store = new MemoryStore(internalStore)
  store.get('invalidId', (_err, value) => {
    t.assert.strictEqual(value, undefined)
  })
})

test('MemoryStore.destroy: should remove a sessionId / 1', t => {
  t.plan(2)

  const internalStore = new Map()
  internalStore.set('someId', { key: 'value' })
  internalStore.set('anotherId', { key: 'value' })

  const store = new MemoryStore(internalStore)
  store.destroy('someId', () => {
    t.assert.strictEqual(internalStore.size, 1)
    t.assert.ok(internalStore.has('anotherId'))
  })
})

test('MemoryStore.destroy: should remove a sessionId / 2', t => {
  t.plan(2)

  const internalStore = new Map()
  internalStore.set('someId', { key: 'value' })
  internalStore.set('anotherId', { key: 'value' })

  const store = new MemoryStore(internalStore)
  store.destroy('anotherId', () => {
    t.assert.strictEqual(internalStore.size, 1)
    t.assert.ok(internalStore.has('someId'))
  })
})

test('MemoryStore.destroy: should not remove stored sessions if invalidId is provided', t => {
  t.plan(3)

  const internalStore = new Map()
  internalStore.set('someId', { key: 'value' })
  internalStore.set('anotherId', { key: 'value' })

  const store = new MemoryStore(internalStore)
  store.destroy('invalidId', () => {
    t.assert.strictEqual(internalStore.size, 2)
    t.assert.ok(internalStore.has('someId'))
    t.assert.ok(internalStore.has('anotherId'))
  })
})
