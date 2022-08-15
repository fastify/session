'use strict'

const crypto = require('crypto')

module.exports = idGenerator(32)

function idGenerator (len) {
  const fnBody = []

  fnBody.push('const randomInt = crypto.randomInt;')
  fnBody.push('const base64url = \'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\'.split(\'\');')
  fnBody.push('return function () {')
  const chars = []
  for (let i = 0; i < ((len) | 0); ++i) chars.push('base64url[randomInt(0, 64)]')
  fnBody.push('return ' + chars.join('+'))
  fnBody.push('}')
  return new Function('crypto', fnBody.join(''))(crypto) // eslint-disable-line no-new-func
}
