var AsyncCache = require('async-cache')
var isUrl = require('is-url-superb')
var jsonist = require('jsonist')
var jwt = require('jsonwebtoken')
var Wildemitter = require('wildemitter')

var Client = module.exports = function (opts) {
  if (!opts) throw new Error('opts are required argument')
  if (!opts.server || !isUrl(opts.server)) throw new Error('opts.server must be url')

  if (!(this instanceof Client)) return new Client(opts)

  this.server = opts.server
  this.prefix = opts.prefix || '/auth'
  this.email = opts.email
  this.password = opts.password
  this.authToken = opts.authToken

  this.pubKeyUrl = (opts.pubKeyUrl || this.getEndpoint('public-key'))
  this.cache = createCache(this.pubKeyUrl, opts.cacheDuration)

  return this
}

Wildemitter.mixin(Client)

Client.prototype.get = function (url, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  var self = this
  verifyToken(this, function (err) {
    if (err) {
      var loginOpts = {
        email: self.email,
        password: self.password
      }
      if (shouldLogin(loginOpts)) {
        return self.login(loginOpts, function (err) {
          if (err) return cb(err)
          return get(url, addAuthHeader(self.authToken, opts), cb)
        })
      } else {
        return get(url, opts, cb) // behave like jsonist when there is not enough data to login
      }
    } else {
      return get(url, addAuthHeader(self.authToken, opts), cb)
    }
  })
}

Client.prototype.post = function (url, data, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  var self = this
  verifyToken(this, function (err) {
    if (err) {
      var loginOpts = {
        email: self.email,
        password: self.password
      }
      if (shouldLogin(loginOpts)) {
        return self.login(loginOpts, function (err) {
          if (err) return cb(err)
          return post(url, data, addAuthHeader(self.authToken, opts), cb)
        })
      } else {
        return post(url, data, opts, cb)
      }
    } else {
      return post(url, data, addAuthHeader(self.authToken, opts), cb)
    }
  })
}

Client.prototype.put = function (url, data, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  var self = this
  verifyToken(this, function (err) {
    if (err) {
      var loginOpts = {
        email: self.email,
        password: self.password
      }
      if (shouldLogin(loginOpts)) {
        return self.login(loginOpts, function (err) {
          if (err) return cb(err)
          return put(url, data, addAuthHeader(self.authToken, opts), cb)
        })
      } else {
        return put(url, data, opts, cb)
      }
    } else {
      return put(url, data, addAuthHeader(self.authToken, opts), cb)
    }
  })
}

Client.prototype.delete = function (url, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  var self = this
  verifyToken(this, function (err) {
    if (err) {
      var loginOpts = {
        email: self.email,
        password: self.password
      }
      if (shouldLogin(loginOpts)) {
        return self.login(loginOpts, function (err) {
          if (err) return cb(err)
          return del(url, addAuthHeader(self.authToken, opts), cb)
        })
      } else {
        return del(url, opts, cb)
      }
    } else {
      return del(url, addAuthHeader(self.authToken, opts), cb)
    }
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
  return verifyToken(this, cb)
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
  jsonist[method === 'put' ? method : 'post'](
    getUrl(url),
    data,
    opts,
    jsonistHandler(cb)
  )
}

function handler (method, url, opts, cb) {
  jsonist[method === 'delete' ? method : 'get'](
    getUrl(url),
    opts,
    jsonistHandler(cb)
  )
}

function jsonistHandler (cb) {
  return function (err, body, res) {
    if (err) {
      var newError = new Error(err.message)
      newError.statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500
      return cb(newError, body, res)
    }
    if (res.statusCode >= 400) {
      err = new Error('Received statusCode ' + res.statusCode)
      err.statusCode = res.statusCode
    }
    cb(err, body, res)
  }
}

function verifyToken (client, cb) {
  return client.cache.get(client.pubKeyUrl, function (err, pubKey) {
    if (err) return cb(err)
    return jwt.verify(client.authToken, pubKey, { algorithms: ['RS256'] }, cb)
  })
}

function shouldLogin (loginOpts) {
  return loginOpts.email && loginOpts.password
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
