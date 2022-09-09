'use strict'

const isConnectionSecure = require('./isConnectionSecure')

module.exports = function getCookieOpts (cookieOpts, request) {
  const originalMaxAge = cookieOpts.originalMaxAge || cookieOpts.maxAge || null
  let secure = cookieOpts.secure ?? null
  let sameSite = cookieOpts.sameSite || null
  let expires = null

  if (originalMaxAge) {
    expires = new Date(Date.now() + originalMaxAge)
  } else if (cookieOpts.expires) {
    expires = new Date(cookieOpts.expires)
  }

  if (secure === 'auto') {
    if (isConnectionSecure(request)) {
      secure = true
    } else {
      sameSite = 'Lax'
      secure = false
    }
  }

  return {
    expires,
    originalMaxAge,
    sameSite,
    secure,
    path: cookieOpts.path || '/',
    httpOnly: cookieOpts.httpOnly !== undefined ? cookieOpts.httpOnly : true,
    domain: cookieOpts.domain || null
  }
}
