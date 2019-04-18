'use strict'

module.exports = class Cookie {
  constructor (cookieOpts) {
    this.maxAge = cookieOpts.maxAge || null
    this.path = cookieOpts.path || '/'
    this.httpOnly = cookieOpts.httpOnly !== undefined ? cookieOpts.httpOnly : true
    this.secure = cookieOpts.secure
    this.expires = getExpires(cookieOpts)
    this.sameSite = cookieOpts.sameSite || null
    this.domain = cookieOpts.domain || null
  }

  options () {
    return {
      path: this.path,
      httpOnly: this.httpOnly,
      secure: this.secure,
      expires: this.expires,
      sameSite: this.sameSite,
      domain: this.domain
    }
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
