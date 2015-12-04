var jsonist = require('jsonist')
var Wildemitter = require('wildemitter')

var Client = module.exports = function (opts) {
  if (!(this instanceof Client)) return new Client(opts)

  this.server = opts.server
  this.prefix = opts.prefix || '/auth'

  this.email = opts.email
  this.authToken = opts.authToken

  return this
}

Wildemitter.mixin(Client)

Client.prototype.get = function (url, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }

  if (this.authToken) {
    opts.headers = opts.headers || {}
    opts.headers.authorization = 'Bearer ' + this.authToken
  }

  get(url, opts, cb)
}

Client.prototype.post = function (url, data, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }

  if (this.authToken) {
    opts.headers = opts.headers || {}
    opts.headers.authorization = 'Bearer ' + this.authToken
  }

  post(url, data, opts, cb)
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

Client.prototype.logout = function() {
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

function post (url, data, opts, cb) {
  if (process.browser && url.match(/^\//)) url = window.location.origin + url

  jsonist.post(url, data, opts, function (err, body, res) {
    if (err) return cb(err)
    if (body.error) return cb(new Error(body.error))
    if (res.statusCode >= 400) return cb(new Error('Received statusCode ' + res.statusCode))

    cb(err, body, res)
  })
}

function get (url, opts, cb) {
  if (process.browser && url.match(/^\//)) url = window.location.origin + url

  jsonist.get(url, opts, function (err, body, res) {
    if (err) return cb(err)
    if (body && body.error) return cb(new Error(body.error))
    if (res.statusCode >= 400) return cb(new Error('Received statusCode ' + res.statusCode))

    cb(err, body, res)
  })
}
