'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

test('lib/version.js should be the same as package.json', t => {
  t.plan(1)

  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')).toString('utf8'))
  const version = require('../lib/version')

  t.assert.strictEqual(version, json.version)
})
