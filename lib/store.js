module.exports = Store

function Store() {
  this.store = {};
}

Store.prototype.set = function set(sessionId, session, callback) {
  this.store[sessionId] = session;
  callback();
}

Store.prototype.get = function get(sessionId, callback) {
  const session = this.store[sessionId];
  callback(null, session);
}

Store.prototype.destroy = function destroy(sessionId, callback) {
  this.store[sessionId] = undefined;
  callback()
}