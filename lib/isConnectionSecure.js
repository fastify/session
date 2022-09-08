'use strict'

module.exports = function isConnectionSecure (request) {
  return (
    request.raw.socket?.encrypted === true ||
    request.headers['x-forwarded-proto'] === 'https'
  )
}
