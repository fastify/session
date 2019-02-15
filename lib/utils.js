const uid = require('uid-safe').sync
const cookieSignature = require('cookie-signature')

function generateSessionIds (secret) {
  const sessionId = uid(24)
  const encryptedSessionId = cookieSignature.sign(sessionId, secret)
  return { sessionId, encryptedSessionId }
}

module.exports = generateSessionIds
