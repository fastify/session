'use strict'

const test = require('node:test')
const idGenerator = require('../lib/idGenerator')

const cacheSize = 1 << 7 + 1

if (Buffer.isEncoding('base64url')) {
  test('should have no collisions, base64url', async (t) => {
    const idGen = idGenerator(true)
    t.plan(cacheSize)
    const ids = new Set()

    for (let i = 0; i < cacheSize; ++i) {
      const id = idGen()
      if (ids.has(id)) {
        t.assert.ifError('had a collision')
      }
      t.assert.strictEqual(id.length, 32)
      ids.add(id)
    }
  })
}

test('should have no collisions, base64', async (t) => {
  const idGen = idGenerator(false)
  t.plan(cacheSize)
  const ids = new Set()

  for (let i = 0; i < cacheSize; ++i) {
    const id = idGen()
    if (ids.has(id)) {
      t.assert.ifError('had a collision')
    }
    t.assert.strictEqual(id.length, 32)
    ids.add(id)
  }
})
