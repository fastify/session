'use strict'

const EventEmitter = require('events').EventEmitter
const util = require('util')

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
