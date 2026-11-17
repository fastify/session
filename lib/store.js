'use strict'

const EventEmitter = require('node:events').EventEmitter
const util = require('node:util')
const { getSessionGeneration } = require('./sessionMetadata')

function Store (storeMap = new Map()) {
  this.store = storeMap
  EventEmitter.call(this)
}

util.inherits(Store, EventEmitter)

Store.prototype.set = function set (sessionId, session, callback) {
  this.store.set(sessionId, session)
  callback()
}

Store.prototype.get = function get (sessionId, callback) {
  const session = this.store.get(sessionId)
  callback(null, session)
}

Store.prototype.compareAndSet = function compareAndSet (sessionId, expectedGeneration, session, callback) {
  const storedSession = this.store.get(sessionId)
  if (!storedSession || getSessionGeneration(storedSession, sessionId) !== expectedGeneration) {
    const error = new Error('The session does not exist or has changed')
    error.code = 'ENOENT'
    callback(error)
    return
  }

  this.store.set(sessionId, session)
  callback()
}

Store.prototype.destroy = function destroy (sessionId, callback) {
  this.store.delete(sessionId)
  callback()
}

module.exports = Store
module.exports.default = Store
module.exports.Store = Store
module.exports.MemoryStore = Store
