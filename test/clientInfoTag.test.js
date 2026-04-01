'use strict'

const test = require('node:test')
const fastifySession = require('..')

test('getDefaultClientInfoTag should return version tag', (t) => {
  t.plan(1)
  const tag = fastifySession.getDefaultClientInfoTag()
  t.assert.match(tag, /^fastify-session_v\d+\.\d+\.\d+$/)
})

test('getDefaultClientInfoTag should be accessible from module', (t) => {
  t.plan(1)
  t.assert.strictEqual(typeof fastifySession.getDefaultClientInfoTag, 'function')
})

test('getDefaultClientInfoTag should fallback to fastify-session when version is unavailable', (t) => {
  t.plan(1)

  // Mock require to simulate missing version.js
  const Module = require('module')
  const originalRequire = Module.prototype.require

  Module.prototype.require = function (id) {
    if (id === './version') {
      throw new Error('Cannot find module')
    }
    return originalRequire.apply(this, arguments)
  }

  // Clear the require cache
  delete require.cache[require.resolve('..')]
  delete require.cache[require.resolve('../lib/version')]

  const fastifySessionMocked = require('..')
  const tag = fastifySessionMocked.getDefaultClientInfoTag()

  // Restore original require
  Module.prototype.require = originalRequire

  // Clear cache again
  delete require.cache[require.resolve('..')]
  delete require.cache[require.resolve('../lib/version')]

  t.assert.strictEqual(tag, 'fastify-session')
})
