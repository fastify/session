'use strict'

const { EventEmitter } = require('events')

module.exports = class Store extends EventEmitter {
  constructor (storeMap = new Map()) {
    super()
    this.store = storeMap
  }

  set (sessionId, session, callback) {
    this.store.set(sessionId, session)
    callback()
  }

  get (sessionId, callback) {
    const session = this.store.get(sessionId)
    callback(null, session)
  }

  destroy (sessionId, callback) {
    this.store.delete(sessionId)
    callback(null)
  }

  length (callback) {
    callback(null, this.store.size)
  }
}
