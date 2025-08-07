var isUrl = require('is-url-superb')
var Wildemitter = require('wildemitter')

// Use global fetch (Node.js 18+ and browsers)
/* global fetch */
var fetchFn = typeof fetch !== 'undefined' ? fetch : function () {
  throw new Error('fetch not available - requires Node.js 18+ or polyfill')
}

var Client = module.exports = function (opts) {
  if (!opts) throw new Error('opts are required argument')
  if (!isUrl(opts.server)) throw new Error('opts.server must be url')

  if (!(this instanceof Client)) return new Client(opts)

  this.server = opts.server
  this.prefix = opts.prefix || '/auth'
  this.email = opts.email
  this.authToken = opts.authToken

  this.googleSignInUrl = this.server + this.prefix + '/google'

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

  return this.verifyToken(function (err) {
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

  return this.verifyToken(function (err) {
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

  return this.verifyToken(function (err) {
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

  return this.verifyToken(function (err) {
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

Client.prototype.magicRequest = function (opts, cb) {
  var url = this.getEndpoint('magic-request')
  post(url, opts, {}, cb)
}

Client.prototype.magicLogin = function (opts, cb) {
  var self = this
  var url = this.getEndpoint('magic-login')
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
  var self = this
  return verifyToken(this.authToken, function (err) {
    if (err) {
      self.logout()
      return cb(err)
    }

    return cb()
  })
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
  var fetchOpts = {
    method: method.toUpperCase(),
    headers: Object.assign({
      'Content-Type': 'application/json'
    }, opts.headers || {})
  }

  if (data) {
    fetchOpts.body = JSON.stringify(data)
  }

  fetchFn(_url, fetchOpts)
    .then(function (res) {
      return res.text().then(function (text) {
        var body
        try {
          body = text ? JSON.parse(text) : null
        } catch (e) {
          body = text
        }

        if (res.status >= 400) {
          var err = new Error((body && body.error) || res.statusText)
          err.statusCode = res.status
          err.body = body
          return cb(err)
        }

        // Create a simplified response object compatible with jsonist
        var response = {
          statusCode: res.status,
          statusMessage: res.statusText,
          headers: {}
        }

        // Copy headers
        res.headers.forEach(function (value, key) {
          response.headers[key] = value
        })

        cb(null, body, response)
      })
    })
    .catch(cb)
}

function handler (method, url, opts, cb) {
  var _url = getUrl(url)
  var fetchOpts = {
    method: method.toUpperCase(),
    headers: Object.assign({}, opts.headers || {})
  }

  fetchFn(_url, fetchOpts)
    .then(function (res) {
      return res.text().then(function (text) {
        var body
        try {
          body = text ? JSON.parse(text) : null
        } catch (e) {
          body = text
        }

        if (res.status >= 400) {
          var err = new Error((body && body.error) || res.statusText)
          err.statusCode = res.status
          err.body = body
          return cb(err)
        }

        // Create a simplified response object compatible with jsonist
        var response = {
          statusCode: res.status,
          statusMessage: res.statusText,
          headers: {}
        }

        // Copy headers
        res.headers.forEach(function (value, key) {
          response.headers[key] = value
        })

        cb(null, body, response)
      })
    })
    .catch(cb)
}

function verifyToken (token, cb) {
  if (!token) return cb(new Error('jwt must be provided'))

  try {
    // Decode JWT without signature verification
    var parts = token.split('.')
    if (parts.length !== 3) {
      return cb(new Error('jwt malformed'))
    }

    // Decode payload (base64url)
    var payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return cb(new Error('jwt expired'))
    }

    return cb(null, payload)
  } catch (err) {
    return cb(new Error('jwt malformed'))
  }
}

function getUrl (url) {
  // Detect browser environment without using process
  var isBrowser = typeof window !== 'undefined' && typeof window.location !== 'undefined'
  return isBrowser && url.match(/^\//)
    ? window.location.origin + url
    : url
}

function addAuthHeader (token, opts) {
  if (!token) return opts

  return Object.assign({}, opts, {
    headers: { authorization: 'Bearer ' + token }
  })
}
