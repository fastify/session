'use strict'

module.exports = function createProxyStore (store) {
  const promisifyStore = {
    get (sessionId, callback) {
      if (callback) {
        return store.get(sessionId, callback)
      }
      return new Promise((resolve, reject) => {
        store.get(sessionId, (err, session) => {
          if (err) reject(err)
          else resolve(session)
        })
      })
    },

    set (sessionId, session, callback) {
      if (callback) {
        return store.set(sessionId, session, callback)
      }
      return new Promise((resolve, reject) => {
        store.set(sessionId, session, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    },

    destroy (sessionId, callback) {
      if (callback) {
        return store.destroy(sessionId, callback)
      }
      return new Promise((resolve, reject) => {
        store.destroy(sessionId, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }

  return new Proxy(store, {
    get (target, property) {
      if (property in promisifyStore) {
        return promisifyStore[property]
      }
      return target[property]
    }
  })
}
