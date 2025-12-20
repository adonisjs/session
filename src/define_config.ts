/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/redis/redis_provider" />
/// <reference types="@adonisjs/lucid/database_provider" />

import { configProvider } from '@adonisjs/core'
import string from '@adonisjs/core/helpers/string'
import type { ConfigProvider } from '@adonisjs/core/types'
import type { CookieOptions } from '@adonisjs/core/types/http'
import { InvalidArgumentsException, RuntimeException } from '@adonisjs/core/exceptions'

import debug from './debug.ts'
import { MemoryStore } from './stores/memory.ts'
import type {
  SessionConfig,
  FileStoreConfig,
  RedisStoreConfig,
  SessionStoreFactory,
  DynamoDBStoreConfig,
  DatabaseStoreConfig,
} from './types.ts'

type ConfigInput<
  KnownStores extends Record<string, SessionStoreFactory | ConfigProvider<SessionStoreFactory>>,
> = Partial<SessionConfig> & {
  store: keyof KnownStores | 'memory'
  stores: KnownStores
  /**
   * Whether to clear the session cookie when the browser is closed.
   * When true, creates a session cookie that expires on browser close.
   * Note: Persisted session data continues to exist until it expires.
   */
  clearWithBrowser?: boolean
  cookie?: Omit<Partial<CookieOptions>, 'maxAge' | 'expires'>
}

/**
 * Resolved session configuration with all stores resolved
 */
type ResolvedConfig<KnownStores extends Record<string, SessionStoreFactory>> = SessionConfig & {
  store: keyof KnownStores
  stores: KnownStores
}

/**
 * Defines and validates session configuration with store setup.
 * Handles default values and store resolution.
 *
 * @param config - Session configuration with stores
 *
 * @example
 * import { defineConfig, stores } from '@adonisjs/session'
 *
 * export default defineConfig({
 *   enabled: true,
 *   cookieName: 'adonis_session',
 *   age: '2 hours',
 *   store: 'cookie',
 *   stores: {
 *     cookie: stores.cookie(),
 *     redis: stores.redis({ connection: 'main' })
 *   }
 * })
 */
export function defineConfig<
  KnownStores extends Record<string, SessionStoreFactory | ConfigProvider<SessionStoreFactory>>,
>(
  config: ConfigInput<KnownStores>
): ConfigProvider<
  ResolvedConfig<{
    [K in keyof KnownStores]: SessionStoreFactory
  }>
> {
  debug('processing session config %O', config)

  /**
   * Make sure a store is defined
   */
  if (!config.store) {
    throw new InvalidArgumentsException('Missing "store" property inside the session config')
  }

  /**
   * Destructuring config with the default values. We pull out
   * stores and cookie values, since we have to transform
   * them in the output value.
   */
  const { stores, cookie, ...rest } = {
    enabled: true,
    age: '2h',
    cookieName: 'adonis_session',
    clearWithBrowser: false,
    ...config,
  }

  const cookieOptions: Partial<CookieOptions> = { ...cookie }

  /**
   * Define maxAge property when session id cookie is
   * persistent cookie.
   * "clearWithBrowser = non-persistent cookie"
   */
  if (!rest.clearWithBrowser) {
    cookieOptions.maxAge = string.seconds.parse(rest.age)
    debug('computing maxAge "%s" for session id cookie', cookieOptions.maxAge)
  } else {
    cookieOptions.maxAge = undefined
    cookieOptions.expires = undefined
  }

  return configProvider.create(async (app) => {
    const storesNames = Object.keys(config.stores)

    /**
     * List of stores with memory store always configured
     */
    const storesList = {
      memory: () => new MemoryStore(),
    } as Record<string, SessionStoreFactory>

    /**
     * Looping for stores and resolving them
     */
    for (let storeName of storesNames) {
      const store = config.stores[storeName]
      if (typeof store === 'function') {
        storesList[storeName] = store
      } else {
        storesList[storeName] = await store.resolver(app)
      }
    }

    const transformedConfig = {
      ...rest,
      cookie: cookieOptions,
      stores: storesList as { [K in keyof KnownStores]: SessionStoreFactory },
    }

    debug('transformed session config %O', transformedConfig)
    return transformedConfig
  })
}

/**
 * Built-in session stores for different storage backends.
 * Each store provides a different persistence mechanism for session data.
 *
 * @example
 * import { stores } from '@adonisjs/session'
 *
 * // File store - stores on filesystem
 * stores.file({ location: './tmp/sessions' })
 *
 * // Redis store - stores in Redis
 * stores.redis({ connection: 'main' })
 *
 * // Cookie store - stores in encrypted cookies
 * stores.cookie()
 *
 * // DynamoDB store - stores in AWS DynamoDB
 * stores.dynamodb({ tableName: 'Sessions' })
 */
export const stores: {
  file: (config: FileStoreConfig) => ConfigProvider<SessionStoreFactory>
  redis: (config: RedisStoreConfig) => ConfigProvider<SessionStoreFactory>
  cookie: () => ConfigProvider<SessionStoreFactory>
  dynamodb: (config: DynamoDBStoreConfig) => ConfigProvider<SessionStoreFactory>
  database: (config?: DatabaseStoreConfig) => ConfigProvider<SessionStoreFactory>
} = {
  /**
   * Creates a file-based session store
   *
   * @param config - File store configuration
   */
  file: (config) => {
    return configProvider.create(async () => {
      const { FileStore } = await import('./stores/file.js')
      return (_, sessionConfig: SessionConfig) => {
        return new FileStore(config, sessionConfig.age)
      }
    })
  },
  /**
   * Creates a Redis-based session store
   *
   * @param config - Redis store configuration
   */
  redis: (config) => {
    return configProvider.create(async (app) => {
      const { RedisStore } = await import('./stores/redis.js')
      const redis = await app.container.make('redis')

      return (_, sessionConfig: SessionConfig) => {
        return new RedisStore(redis.connection(config.connection), sessionConfig.age)
      }
    })
  },
  /**
   * Creates a cookie-based session store
   */
  cookie: () => {
    return configProvider.create(async () => {
      const { CookieStore } = await import('./stores/cookie.js')
      return (ctx, sessionConfig: SessionConfig) => {
        return new CookieStore(sessionConfig.cookie, ctx)
      }
    })
  },
  /**
   * Creates a DynamoDB-based session store
   *
   * @param config - DynamoDB store configuration
   */
  dynamodb: (config) => {
    return configProvider.create(async () => {
      const { DynamoDBStore } = await import('./stores/dynamodb.js')
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')

      const client =
        'clientConfig' in config ? new DynamoDBClient(config.clientConfig) : config.client

      return (_, sessionConfig: SessionConfig) => {
        return new DynamoDBStore(client, sessionConfig.age, {
          tableName: config.tableName,
          keyAttribute: config.keyAttribute,
        })
      }
    })
  },
  /**
   * Creates a database-based session store using Lucid
   *
   * @param config - Database store configuration
   */
  database: (config) => {
    return configProvider.create(async (app) => {
      const { DatabaseStore } = await import('./stores/database.js')
      const db = await app.container.make('lucid.db')
      const connectionName = config?.connectionName || db.primaryConnectionName

      if (!db.manager.has(connectionName)) {
        throw new RuntimeException(
          `Invalid database connection "${connectionName}" referenced in session config`
        )
      }

      return (_, sessionConfig: SessionConfig) => {
        return new DatabaseStore(db.connection(connectionName), sessionConfig.age, {
          tableName: config?.tableName,
          gcProbability: config?.gcProbability,
        })
      }
    })
  },
}
