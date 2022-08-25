'use strict'

const { EventEmitter } = require('events')

class TestStore extends EventEmitter {
  constructor (storeMap = new Map()) {
    super()
    this.store = storeMap
  }

  set (sessionId, session, callback) {
    this.store.set(sessionId, JSON.parse(JSON.stringify(session)))
    callback()
  }

  get (sessionId, callback) {
    const session = this.store.get(sessionId)
    callback(null, session)
  }

  destroy (sessionId, callback) {
    this.store.delete(sessionId)
    callback()
  }
}

module.exports = TestStore
