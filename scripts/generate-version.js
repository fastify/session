#!/usr/bin/env node
'use strict'

const { writeFileSync } = require('node:fs')
const { join } = require('node:path')

const pkg = require('../package.json')

const versionFilePath = join(__dirname, '..', 'lib', 'version.js')
const content = `'use strict'

// This file is auto-generated during the release process
module.exports = '${pkg.version}'
`

writeFileSync(versionFilePath, content, 'utf8')
console.log(`Generated lib/version.js with version ${pkg.version}`)
