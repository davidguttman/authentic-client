var AsyncCache = require('async-cache')
var isUrl = require('is-url-superb')
var jsonist = require('jsonist')
var jwt = require('jsonwebtoken')
var Wildemitter = require('wildemitter')

var Client = module.exports = function (opts) {
  if (!opts) throw new Error('opts are required argument')
  if (!isUrl(opts.server)) throw new Error('opts.server must be url')

  if (!(this instanceof Client)) return new Client(opts)

  this.server = opts.server
  this.prefix = opts.prefix || '/auth'
  this.email = opts.email
  this.authToken = opts.authToken

  this.pubKeyUrl = (opts.pubKeyUrl || this.server + this.prefix + '/public-key')
  this.cache = createCache(this.pubKeyUrl, opts.cacheDuration)

  return this
}

Wildemitter.mixin(Client)

Client.prototype.get = function (url, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  var token = this.authToken
  if (!token) return get(url, opts, cb)

  return verifyToken(this.cache, token, function (err) {
    if (err) return cb(err)
    return get(url, addAuthHeader(token, opts), cb)
  })
}

Client.prototype.post = function (url, data, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  var token = this.authToken
  if (!token) return post(url, data, opts, cb)

  return verifyToken(this.cache, token, function (err) {
    if (err) return cb(err)
    return post(url, data, addAuthHeader(token, opts), cb)
  })
}

Client.prototype.put = function (url, data, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  var token = this.authToken
  if (!token) return post(url, data, opts, cb)

  return verifyToken(this.cache, token, function (err) {
    if (err) return cb(err)
    return put(url, data, addAuthHeader(token, opts), cb)
  })
}

Client.prototype.delete = function (url, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }

  var token = this.authToken
  if (!token) return del(url, opts, cb)

  return verifyToken(this.cache, token, function (err) {
    if (err) return cb(err)
    return del(url, addAuthHeader(token, opts), cb)
  })
}

Client.prototype.signup = function (opts, cb) {
  var url = this.getEndpoint('signup')
  post(url, opts, {}, cb)
}

Client.prototype.confirm = function (opts, cb) {
  var self = this
  var url = this.getEndpoint('confirm')
  this.setEmail(opts.email)
  post(url, opts, {}, function (err, data) {
    if (err) return cb(err)

    self.setAuthToken(data.data.authToken)
    cb(null, data)
  })
}

Client.prototype.login = function (opts, cb) {
  var self = this
  var url = this.getEndpoint('login')
  this.setEmail(opts.email)
  post(url, opts, {}, function (err, data) {
    if (err) return cb(err)

    self.setAuthToken(data.data.authToken)
    cb(null, data)
  })
}

Client.prototype.changePasswordRequest = function (opts, cb) {
  var url = this.getEndpoint('change-password-request')
  post(url, opts, {}, cb)
}

Client.prototype.changePassword = function (opts, cb) {
  var self = this
  var url = this.getEndpoint('change-password')
  this.setEmail(opts.email)
  post(url, opts, {}, function (err, data) {
    if (err) return cb(err)

    self.setAuthToken(data.data.authToken)
    cb(null, data)
  })
}

Client.prototype.logout = function () {
  this.setAuthToken(null)
  this.setEmail(null)
}

Client.prototype.getEndpoint = function (name) {
  return this.server + this.prefix + '/' + name
}

Client.prototype.setAuthToken = function (token) {
  this.authToken = token
  this.emit('authToken', token)
}

Client.prototype.setEmail = function (email) {
  this.email = email
  this.emit('email', email)
}

Client.prototype.verifyToken = function (cb) {
  return verifyToken(this.cache, this.authToken, cb)
}

function post (url, data, opts, cb) {
  return dataHandler('post', url, data, opts, cb)
}

function put (url, data, opts, cb) {
  return dataHandler('put', url, data, opts, cb)
}

function get (url, opts, cb) {
  return handler('get', url, opts, cb)
}

function del (url, opts, cb) {
  return handler('delete', url, opts, cb)
}

function dataHandler (method, url, data, opts, cb) {
  var _url = getUrl(url)

  jsonist[method === 'put' ? method : 'post'](_url, data, opts, function (
    err,
    body,
    res
  ) {
    if (err) return cb(err)
    if (body.error) return cb(new Error(body.error))
    if (res.statusCode >= 400) return cb(new Error('Received statusCode ' + res.statusCode))

    cb(err, body, res)
  })
}

function handler (method, url, opts, cb) {
  var _url = getUrl(url)

  jsonist[method === 'delete' ? method : 'get'](_url, opts, function (
    err,
    body,
    res
  ) {
    if (err) return cb(err)
    if (body && body.error) return cb(new Error(body.error))
    if (res.statusCode >= 400) return cb(new Error('Received statusCode ' + res.statusCode))

    cb(err, body, res)
  })
}

function verifyToken (cache, token, cb) {
  return cache.get('pubKey', onPublicKey)

  function onPublicKey (err, pubKey) {
    return err
      ? cb(err)
      : jwt.verify(token, pubKey, { algorithms: ['RS256'] }, cb)
  }
}

function createCache (pubKeyUrl, cacheDuration) {
  return new AsyncCache({
    maxAge: cacheDuration || 1000 * 60 * 60,

    load: function (key, cb) {
      return jsonist.get(pubKeyUrl, function (err, body) {
        if (err) return cb(err)

        var pubKey = ((body || {}).data || {}).publicKey
        if (!pubKey) return cb(new Error('Could not retrieve public key'))

        return cb(null, pubKey)
      })
    }
  })
}

function getUrl (url) {
  return process.browser && url.match(/^\//)
    ? window.location.origin + url
    : url
}

function addAuthHeader (token, opts) {
  if (!token) return opts

  return Object.assign({}, opts, {
    headers: { authorization: 'Bearer ' + token }
  })
}
