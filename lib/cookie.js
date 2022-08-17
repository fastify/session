'use strict'

class Cookie {
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
  if (cookieOpts.expires) {
    return cookieOpts.expires
  } else if (cookieOpts.maxAge) {
    return new Date(Date.now() + cookieOpts.maxAge)
  }
  return null
}

module.exports = Cookie
module.exports.getExpires = getExpires
