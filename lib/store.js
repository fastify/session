module.exports = class Store {
  constructor() {
    this.store = {}
  }

  set(sessionId, session, callback) {
    this.store[sessionId] = session;
    callback();
  }

  get(sessionId, callback) {
    const session = this.store[sessionId];
    callback(null, session);
  }

  destroy(sessionId, callback) {
    this.store[sessionId] = undefined;
    callback()
  }
}