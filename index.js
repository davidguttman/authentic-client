var jsonist = require('jsonist')

var Client = module.exports = function (opts) {
  if (!(this instanceof Client)) return new Client(opts)

  this.server = opts.server
  this.prefix = opts.prefix || '/auth'

  this.email = null
  this.authToken = null

  return this
}

Client.prototype.signup = function (opts, cb) {
  var url = this.getEndpoint('signup')
  post(url, opts, cb)
}

Client.prototype.confirm = function (opts, cb) {
  var self = this
  var url = this.getEndpoint('confirm')
  this.email = opts.email
  post(url, opts, function (err, data) {
    if (err) return cb(err)

    self.authToken = data.data.authToken
    cb(null, data)
  })
}

Client.prototype.login = function (opts, cb) {
  var self = this
  var url = this.getEndpoint('login')
  this.email = opts.email
  post(url, opts, function (err, data) {
    if (err) return cb(err)

    self.authToken = data.data.authToken
    cb(null, data)
  })
}

Client.prototype.changePasswordRequest = function (opts, cb) {
  var url = this.getEndpoint('change-password-request')
  post(url, opts, cb)
}

Client.prototype.changePassword = function (opts, cb) {
  var self = this
  var url = this.getEndpoint('change-password')
  this.email = opts.email
  post(url, opts, function (err, data) {
    if (err) return cb(err)

    self.authToken = data.data.authToken
    cb(null, data)
  })
}

Client.prototype.getEndpoint = function (name) {
  return this.server + this.prefix + '/' + name
}

function post (url, data, cb) {
  if (process.browser && url.match(/^\//)) url = window.location.origin + url

  jsonist.post(url, data, function (err, body, res) {
    if (err) return cb(err)
    if (body.error) return cb(new Error(body.error))
    if (res.statusCode >= 400) return cb(new Error('Received statusCode ' + res.statusCode))

    cb(err, body, res)
  })
}

// function get (url, cb) {
//   if (process.browser && url.match(/^\//)) url = window.location.origin + url

//   jsonist.get(url, function (err, body, res) {
//     if (err) return cb(err)
//     if (body.error) return cb(new Error(body.error))
//     if (res.statusCode >= 400) return cb(new Error('Received statusCode ' + res.statusCode))

//     cb(err, body, res)
//   })
// }
