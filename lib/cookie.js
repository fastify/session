'use strict'

module.exports = class Cookie {
  constructor (cookieOpts) {
    this.path = '/'
    this.maxAge = null
    this.httpOnly = true
    Object.assign(this, cookieOpts)
  }
}
