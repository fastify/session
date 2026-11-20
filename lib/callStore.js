'use strict'

/**
 * Calls `store[method](...args, callback)`. A store written with async
 * functions settles the promise it returns instead of calling the callback,
 * so that promise settles the callback too. Only the first of the two counts,
 * so stores that do both (call the callback and return a promise) work as
 * well.
 */
function callStore (store, method, args, callback) {
  let called = false
  const done = (error, result) => {
    if (called) {
      return
    }
    called = true
    callback(error, result)
  }

  const returned = store[method](...args, done)

  if (returned && typeof returned.then === 'function') {
    returned.then(
      result => done(null, result),
      error => {
        if (called) {
          // Leave a late rejection unhandled, as it would be without this
          // handler, rather than hiding it
          throw error
        }
        done(error)
      }
    )
  }
}

module.exports = callStore
