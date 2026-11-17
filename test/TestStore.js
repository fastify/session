'use strict'

const { MemoryStore } = require('../lib/store')
const { getSessionGeneration } = require('../lib/sessionMetadata')

class TestStore extends MemoryStore {
  set (sessionId, session, callback) {
    this.store.set(sessionId, JSON.parse(JSON.stringify(session)))
    callback()
  }

  compareAndSet (sessionId, expectedGeneration, session, callback) {
    const storedSession = this.store.get(sessionId)
    if (!storedSession || getSessionGeneration(storedSession, sessionId) !== expectedGeneration) {
      const error = new Error('The session does not exist or has changed')
      error.code = 'ENOENT'
      callback(error)
      return
    }

    this.set(sessionId, session, callback)
  }
}

module.exports = TestStore
