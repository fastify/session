'use strict'

const EventEmitter = require('node:events').EventEmitter
const util = require('node:util')

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

Store.prototype.destroy = function destroy (sessionId, callback) {
  this.store.delete(sessionId)
  callback()
}

module.exports = Store
module.exports.default = Store
module.exports.Store = Store
module.exports.MemoryStore = Store
