'use strict'

const test = require('tap').test
const idGenerator = require('../lib/idGenerator')

const cacheSize = 1 << 7 + 1

test('should have no collisions', async (t) => {
  t.plan(cacheSize)
  const ids = new Set()

  for (let i = 0; i < (cacheSize); ++i) {
    const id = idGenerator()
    if (ids.has(id)) {
      t.fail('had a collision')
    }
    t.equal(id.length, 32)
  }
})
