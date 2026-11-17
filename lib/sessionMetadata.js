'use strict'

const metadataKey = '__fastifySessionMetadata'

function getSessionGeneration (session, sessionId) {
  return session?.[metadataKey]?.generation ?? sessionId
}

module.exports = {
  getSessionGeneration,
  metadataKey
}
