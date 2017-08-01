## Registering provider

Make sure to register the provider before you can make use of sessions. The providers are registered inside `start/app.js` file.

```js
const providers = [
  '@adonisjs/session/providers/SessionProvider'
]
```

## Registering middleware

The next thing you should do is register the global middleware inside `start/kernel.js` file.

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
