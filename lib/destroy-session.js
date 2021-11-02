'use strict'

module.exports = function destroySession (done) {
  const request = this
  if (!done) {
    return new Promise((resolve, reject) => {
      request.sessionStore.destroy(request.session.sessionId, (err) => {
        request.session = null
        if (err) reject(err)
        else resolve()
      })
    })
  }
  request.sessionStore.destroy(request.session.sessionId, (err) => {
    request.session = null
    done(err)
  })
}
