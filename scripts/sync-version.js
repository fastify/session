'use strict'

const fs = require('node:fs')
const path = require('node:path')

// package.json:version -> index.js:VERSION
const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')).toString('utf8'))

const indexJs = path.join(__dirname, '..', 'index.js')
const pattern = /const\s*VERSION\s*=.*/
const source = fs.readFileSync(indexJs).toString('utf8')

if (!pattern.test(source)) {
  throw new Error('Could not find the VERSION constant in index.js')
}

fs.writeFileSync(indexJs, source.replace(pattern, `const VERSION = '${version}'`))
