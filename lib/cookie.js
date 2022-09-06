'use strict'

class Cookie {
  constructor (cookieOpts) {
    this.originalMaxAge = cookieOpts.originalMaxAge || cookieOpts.maxAge || null
    this.path = cookieOpts.path || '/'
    this.httpOnly = cookieOpts.httpOnly !== undefined ? cookieOpts.httpOnly : true
    this.secure = cookieOpts.secure
    this.expires = getExpires(cookieOpts, this.originalMaxAge)
    this.sameSite = cookieOpts.sameSite || null
    this.domain = cookieOpts.domain || null
  }

  options (secureConnection) {
    let secure = this.secure
    let sameSite = this.sameSite
    if (secure === 'auto') {
      if (secureConnection === true) {
        secure = true
      } else {
        sameSite = 'Lax'
        secure = false
      }
    } else {
      secure = this.secure
    }
    return {
      path: this.path,
      httpOnly: this.httpOnly,
      secure,
      expires: this.expires,
      sameSite,
      domain: this.domain
    }
  }
}

function getExpires (cookieOpts, maxAge) {
  if (maxAge) {
    return new Date(Date.now() + maxAge)
  } else if (cookieOpts.expires) {
    return new Date(cookieOpts.expires)
  }
  return null
}

module.exports = Cookie
module.exports.getExpires = getExpires
