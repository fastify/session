'use strict'

module.exports = class Cookie {
  constructor (cookieOpts) {
    this.maxAge = null
    this.path = cookieOpts.path || '/'
    this.httpOnly = cookieOpts.httpOnly !== undefined ? cookieOpts.httpOnly : true
    this.secure = cookieOpts.secure
    this.expires = getExpires(cookieOpts)
    this.sameSite = cookieOpts.sameSite || null
    this.domain = cookieOpts.domain || null
  }
}

function getExpires (cookieOpts) {
  let expires = null
  if (cookieOpts.expires) {
    expires = cookieOpts.expires
  } else if (cookieOpts.maxAge) {
    expires = new Date(Date.now() + cookieOpts.maxAge)
  }
  return expires
}
