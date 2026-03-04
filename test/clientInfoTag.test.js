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

test('getDefaultClientInfoTag should fallback to fastify-session when package.json version is unavailable', (t) => {
  t.plan(1)

  // Mock require to simulate missing package.json
  const Module = require('module')
  const originalRequire = Module.prototype.require

  Module.prototype.require = function (id) {
    if (id === '../package.json') {
      throw new Error('Cannot find module')
    }
    return originalRequire.apply(this, arguments)
  }

  // Clear the require cache
  delete require.cache[require.resolve('..')]

  const fastifySessionMocked = require('..')
  const tag = fastifySessionMocked.getDefaultClientInfoTag()

  // Restore original require
  Module.prototype.require = originalRequire

  // Clear cache again
  delete require.cache[require.resolve('..')]

  t.assert.strictEqual(tag, 'fastify-session')
})
