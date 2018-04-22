## Registering provider

Make sure to register the provider before you can make use of sessions. The providers are registered inside `start/app.js` file.

```js
const providers = [
  '@adonisjs/session/providers/SessionProvider'
]
```

## Registering middleware

The next thing you should do is register the global middleware inside `start/kernel.js` file.

**For Websocket, register the middleware inside `start/wsKernel.js` file.**

```js
const globalMiddleware = [
  'Adonis/Middleware/Session'
]
```

## Using session

Once done with provider and middleware registeration, you can make use of the session by grabbing an instance from the HTTP request context.

```js
Route.get('/', async ({ session }) => {
  session.get('username')
  session.put('username', 'virk')
})
```

## Config

You can find the configuration inside `config/session.js` file. Feel free to tweak it as per your needs.

## Environment Variables

The config file `config/session.js` reference an environment variable called `SESSION_DRIVER` defined in `.env` file. 

Make sure to set the value for production and development both.

```
SESSION_DRIVER=cookie
```


## Testing

When writing tests, make sure to use the `sessions` trait for setting and getting session values.

```js
trait('Session/Client')
```
