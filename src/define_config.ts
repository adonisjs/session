/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@adonisjs/redis/redis_provider" />

import string from '@poppinss/utils/string'
import { configProvider } from '@adonisjs/core'
import type { ConfigProvider } from '@adonisjs/core/types'
import { InvalidArgumentsException } from '@poppinss/utils'
import type { CookieOptions } from '@adonisjs/core/types/http'

import debug from './debug.js'
import { MemoryStore } from './stores/memory.js'
import type {
  SessionConfig,
  FileStoreConfig,
  RedisStoreConfig,
  SessionStoreFactory,
} from './types.js'

/**
 * Resolved config with stores
 */
type ResolvedConfig<KnownStores extends Record<string, SessionStoreFactory>> = SessionConfig & {
  store: keyof KnownStores
  stores: KnownStores
  cookie: Partial<CookieOptions>
}

/**
 * Helper to normalize session config
 */
export function defineConfig<
  KnownStores extends Record<string, SessionStoreFactory | ConfigProvider<SessionStoreFactory>>,
>(
  config: Partial<SessionConfig> & {
    store: keyof KnownStores | 'memory'
    stores: KnownStores
  }
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
   * not a session cookie.
   */
  if (!rest.clearWithBrowser) {
    cookieOptions.maxAge = string.seconds.parse(rest.age)
    debug('computing maxAge "%s" for session id cookie', cookieOptions.maxAge)
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
 * Inbuilt stores to store the session data.
 */
export const stores: {
  file: (config: FileStoreConfig) => ConfigProvider<SessionStoreFactory>
  redis: (config: RedisStoreConfig) => ConfigProvider<SessionStoreFactory>
  cookie: () => ConfigProvider<SessionStoreFactory>
} = {
  file: (config) => {
    return configProvider.create(async () => {
      const { FileStore } = await import('./stores/file.js')
      return (_, sessionConfig: SessionConfig) => {
        return new FileStore(config, sessionConfig.age)
      }
    })
  },
  redis: (config) => {
    return configProvider.create(async (app) => {
      const { RedisStore } = await import('./stores/redis.js')
      const redis = await app.container.make('redis')

      return (_, sessionConfig: SessionConfig) => {
        return new RedisStore(redis.connection(config.connection), sessionConfig.age)
      }
    })
  },
  cookie: () => {
    return configProvider.create(async () => {
      const { CookieStore } = await import('./stores/cookie.js')
      return (ctx, sessionConfig: SessionConfig) => {
        return new CookieStore(sessionConfig.cookie, ctx)
      }
    })
  },
}
