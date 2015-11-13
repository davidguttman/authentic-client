# AuthenticClient #

The client component of [authentic](https://github.com/davidguttman/authentic). This helps interact with an [authentic-server](https://github.com/davidguttman/authentic-server) so that you can easily signup, confirm, login, and change-password for users. It will also help send tokens to microservices that require authentication.

## Example ##

```js
var Authentic = require('authentic-client')

var auth = Authentic({
  server: 'https://auth.scalehaus.io'
})

var creds = {
  email: 'chet@scalehaus.io',
  password: 'notswordfish'
}

// Step 1: log in
auth.login(creds, function (err) {
  if (err) return console.error(err)

  // Step 2: make a JSON request with authentication
  var url = 'https://reporting.scalehaus.io/report'
  auth.get(url, function (err, data) {
    // show that report
    console.log(data)
  })
})
```

## Installation ##

```
npm install --save authentic-client
```

## API ##

### Authentic(opts) ###

This is the main entry point. Accepts an options object and returns an object with helper methods.

```js
var auth = Authentic({
  server: 'https://auth.scalehaus.io'
})

// auth is now an object with various methods:
auth.signup(opts, cb)
auth.confirm(opts, cb)
auth.login(opts, cb)
auth.changePasswordRequest(opts, cb)
auth.changePassword(opts, cb)
```

#### options ####

`Authentic()` takes an options object as its first argument, one of them is required:

* `server`: the url of the `authentic-server`, e.g. `'http://auth.yourdomain.com'`

Optional:

* `prefix`: defaults to `'/auth'` if you set a custom prefix for your `authentic-server`, use that same prefix here
* `authToken`: if you have an authToken from a previous login, you may pass it in for immediate use in `get` and `post`

### auth.signup(opts, cb)

### auth.confirm(opts, cb)

### auth.login(opts, cb)

### auth.changePasswordRequest(opts, cb)

### auth.changePassword(opts, cb)

See [authentic-server](https://github.com/davidguttman/authentic-server)'s Server API for usage

### auth.get(url, opts, cb)

Will make a request using an authToken if one is available, has the same API as [jsonist.get](https://github.com/rvagg/jsonist#jsonistgeturl--options--callback)

### auth.post(url, data, opts, cb)

Will make a request using an authToken if one is available, has the same API as [jsonist.post](https://github.com/rvagg/jsonist#jsonistposturl-data--options--callback)

# License #

MIT
