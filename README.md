# AuthenticClient #

The client component of Authentic. This helps interact with an [authentic-server](https://github.com/davidguttman/authentic-server) so that you can easily signup, confirm, login, and change-password for users. It will also help send tokens to microservices that require authentication.

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

### auth.signup(opts, cb)

### auth.confirm(opts, cb)

### auth.login(opts, cb)

### auth.changePasswordRequest(opts, cb)

### auth.changePassword(opts, cb)

See [authentic-server](https://github.com/davidguttman/authentic-server)'s Server API for usage


# License #

MIT
