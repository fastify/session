'use strict'

const { MemoryStore } = require('../lib/store')

class TestStore extends MemoryStore {
  set (sessionId, session, callback) {
    this.store.set(sessionId, JSON.parse(JSON.stringify(session)))
    callback()
  }
}

module.exports = TestStore
