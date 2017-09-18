var fs = require('fs')
var path = require('path')
var tape = require('tape')
var http = require('http')
var levelmem = require('level-mem')

var AuthenticClient = require('../')
var authenticServer = require('authentic-server')
var authenticService = require('authentic-service')

var client
var lastEmail

var service
var serviceUrl

var server
var serverUrl

var throwsWhen = [
  {
    arg: undefined,
    message: 'opts are required argument'
  },
  {
    arg: {},
    message: 'opts.server must be url'
  }
]

throwsWhen.map(function (obj) {
  tape(`throws when arg is ${obj.arg}`, function (t) {
    t.plan(1)
    t.throws(function () {
      client = new AuthenticClient(obj.arg)
    }, obj.message)
  })
})

tape('init', function (t) {
  server = createServer()
  server.listen(0, function (err) {
    if (err) return console.error(err)

    serverUrl = 'http://localhost:' + this.address().port

    client = new AuthenticClient({server: serverUrl})

    service = createService(serverUrl)
    service.listen(0, function (err) {
      if (err) return console.error(err)
      serviceUrl = 'http://localhost:' + this.address().port
      t.end()
    })
  })
})

tape('no token, verify errors', function (t) {
  client.verifyToken(function (err) {
    t.equal(err.message, 'jwt must be provided', 'error matches')
    t.end()
  })
})

tape('request microservice without token', function (t) {
  t.plan(2)
  client.get(serviceUrl, function (err, data, res) {
    t.deepEqual(data, { error: 'forbidden' }, 'data is carried over in second argument')
    t.equal(err.message, 'Received statusCode 403', 'should get forbidden error')
  })
})

tape('bad token, verify errors', function (t) {
  client.setAuthToken('1234')
  client.verifyToken(function (err) {
    t.equal(err.message, 'jwt malformed', 'error matches')
    t.end()
  })
})

tape('signup, confirm, login', function (t) {
  var signOpts = {
    email: 'chet@scalehaus.io',
    password: 'notswordfish',
    confirmUrl: 'http://admin.scalehaus.io/confirm'
  }

  client.signup(signOpts, function (err, resp) {
    t.ifError(err, 'should not error')
    t.equal(resp.success, true, 'should succeed')
    var confirmToken = lastEmail.confirmToken
    t.equal(confirmToken.length, 60, 'should get confirmToken')

    var confirmOpts = {
      email: signOpts.email,
      confirmToken: confirmToken
    }

    client.confirm(confirmOpts, function (err, resp) {
      t.ifError(err, 'should not error')
      t.equal(resp.success, true, 'should succeed')
      t.ok(resp.data.authToken.length > 800, 'should get authToken')

      t.equal(resp.data.authToken, client.authToken, 'should store token')

      t.end()
    })
  })
})

'get delete'.split(' ').map(function (method) {
  tape('microservice ' + method.toUpperCase() + ' with token', function (t) {
    client[method](serviceUrl, function (err, data) {
      validateData(err, data, null, t)
    })
  })
})

'post put'.split(' ').map(function (method) {
  tape('microservice ' + method.toUpperCase() + ' with token', function (t) {
    var postData = {dummy: 'data'}
    client[method](serviceUrl, postData, function (err, data) {
      validateData(err, data, postData, t)
    })
  })
})

'get delete'.split(' ').map(function (method) {
  tape('microservice ' + method.toUpperCase() + ' with autologin', function (t) {
    client = new AuthenticClient({
      server: serverUrl,
      email: 'chet@scalehaus.io',
      password: 'notswordfish'
    })

    client[method](serviceUrl, function (err, data) {
      validateData(err, data, null, t)
    })
  })
})

'post put'.split(' ').map(function (method) {
  tape('microservice ' + method.toUpperCase() + ' with autologin', function (t) {
    var postData = {dummy: 'data'}
    client = new AuthenticClient({
      server: serverUrl,
      email: 'chet@scalehaus.io',
      password: 'notswordfish'
    })
    client[method](serviceUrl, postData, function (err, data) {
      validateData(err, data, postData, t)
    })
  })
})

'get post put delete'.split(' ').map(function (method) {
  tape(method.toUpperCase() +
    ' behaves like jsoninst on public routes when pass not provided', function (t) {
    client = new AuthenticClient({
      server: serverUrl
    })
    client[method](serviceUrl + '/public', {}, function (err, data) {
      t.ifErr(err)
      t.deepEquals(data, { some: 'publicdoc' }, 'body matches exact')
      t.end()
    })
  })
})

tape('logout', function (t) {
  t.plan(2)
  client.logout()
  t.equals(client.email, null, 'forgets email')
  t.equals(client.authToken, null, 'forgets the token')
})

tape('cleanup', function (t) {
  server.close()
  service.close()
  t.end()
})

function validateData (err, data, postData, t) {
  t.ifError(err, 'should not error')

  if (postData) {
    t.equal(data.authData.email, 'chet@scalehaus.io', 'should have auth email')
    t.deepEqual(data.postData, postData, 'should get postData')
  } else {
    t.equal(data.email, 'chet@scalehaus.io', 'should have auth email')
  }
  t.end()
}

function createServer () {
  return http.createServer(authenticServer({
    db: levelmem('mem', {valueEncoding: 'json'}),
    publicKey: fs.readFileSync(path.join(__dirname, '/rsa-public.pem'), 'utf-8'),
    privateKey: fs.readFileSync(path.join(__dirname, '/rsa-private.pem'), 'utf-8'),
    sendEmail: function (emailOpts, cb) {
      lastEmail = emailOpts
      setImmediate(cb)
    }
  }))
}

function createService (serverUrl) {
  var decrypt = authenticService({server: serverUrl})
  return http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'})
    if (req.url === '/public') {
      return res.end(JSON.stringify({ some: 'publicdoc' }))
    }

    decrypt(req, res, function (err, authData) {
      if (err) return console.error(err)
      if (!authData || !authData.email) {
        res.writeHead(403, {'Content-Type': 'application/json'})
        return res.end(JSON.stringify({error: 'forbidden'}))
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        return res.end(JSON.stringify(authData))
      }

      var buf = ''
      req.on('data', function (chunk) { buf += chunk })
      req.on('end', function () {
        res.end(JSON.stringify({
          authData: authData,
          postData: JSON.parse(buf)
        }))
      })
    })
  })
}
