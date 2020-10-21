The package has been configured successfully. The session configuration stored inside `config/session.ts` file relies on the following environment variables and hence we recommend validating them.

Open the `env.ts` file and paste the following code inside the `Env.rules` object.

```ts
SESSION_DRIVER: Env.schema.string()
```

- Here we expect the `SESSION_DRIVER` environment variable to be always present
- And should be a valid string
