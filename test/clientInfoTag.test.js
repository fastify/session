'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const fastifySession = require('..')

test('getPluginClientInfoTag should be accessible from module', (t) => {
  t.plan(1)
  t.assert.strictEqual(typeof fastifySession.getPluginClientInfoTag, 'function')
})

test('getPluginClientInfoTag should return the version from package.json', (t) => {
  t.plan(1)

  // Fails when the VERSION constant in index.js drifts: run `node scripts/sync-version.js`
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')).toString('utf8'))

  t.assert.strictEqual(fastifySession.getPluginClientInfoTag(), `fastify-session_v${json.version}`)
})
