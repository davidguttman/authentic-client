# AuthenticClient #

The client component of [authentic](https://github.com/davidguttman/authentic). This helps interact with an [authentic-server](https://github.com/davidguttman/authentic-server) so that you can easily signup, confirm, login, and change-password for users. It will also help send tokens to microservices that require authentication.

## Example ##

```js
var Authentic = require('authentic-client')

var auth = Authentic({
  server: 'https://auth.scalehaus.io',
  email: 'chet@scalehaus.io',
  password: 'notswordfish'
})
```

## Installation ##

```
npm install --save authentic-client
```

## API ##

### Authentic(opts) ###

This is the main entry point. Accepts an options object and returns an object with helper methods.

- _server_ is a required option to provide. 
- _email_ and _password_ are optional, and if they are present, it will auto-login so you don't have to login manually.
- you can provide optional `onLogin` callback to be called after auto-login.

```js
var auth = Authentic({
  server: 'https://auth.scalehaus.io',
  email: 'chet@scalehouse.io',
  password: 'notswordfish'
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

### auth.put(url, data, opts, cb)

Will make a request using an authToken if one is available, has the same API as [jsonist.put](https://github.com/rvagg/jsonist#jsonistputurl-data--options--callback)

### auth.delete(url, opts, cb)

Will make a request using an authToken if one is available, has the same API as [jsonist.delete](https://github.com/rvagg/jsonist#jsonistdeleteurl--options--callback)

If token is present, it will be verified before request against authentic-server's public key, and options will be extended with authorization header prior to sending request. 
It will use `Bearer ${token}` scheme.

You can also call `verifyToken` explicitly yourself and provide a callback. (In case of invalid token, `err` is going to be provided by `jsonwebtoken`)

### auth.verifyToken(function(err){ ... })

### Lifecycle events

- 'authToken' each time authToken is being set
- 'email' - each time email is being set


# License #

MIT
