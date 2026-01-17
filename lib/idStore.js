module.exports = {
  get: (request, key) => request.cookies[key],
  set: (reply, key, value, opts) => reply.setCookie(key, value, opts),
  clear: (reply, key, opts) => reply.clearCookie(key, opts)
}
