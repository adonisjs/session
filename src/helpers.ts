/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'

import debug from './debug.js'
import sessionDriversList from './drivers_collection.js'
import type { SessionDriversList } from './types/main.js'

/**
 * Lazily imports and registers a driver with the sessionDriversList
 */
export async function registerSessionDriver(
  app: ApplicationService,
  driverInUse: keyof SessionDriversList
) {
  debug('registering %s driver', driverInUse)

  if (driverInUse === 'cookie') {
    const { CookieDriver } = await import('../src/drivers/cookie.js')
    sessionDriversList.extend('cookie', (config, ctx) => new CookieDriver(config.cookie, ctx))
    return
  }

  if (driverInUse === 'memory') {
    const { MemoryDriver } = await import('../src/drivers/memory.js')
    sessionDriversList.extend('memory', () => new MemoryDriver())
    return
  }

  if (driverInUse === 'file') {
    const { FileDriver } = await import('../src/drivers/file.js')
    sessionDriversList.extend('file', (config) => new FileDriver(config.file!, config.age))
    return
  }

  if (driverInUse === 'redis') {
    const { RedisDriver } = await import('../src/drivers/redis.js')
    const redis = await app.container.make('redis')
    sessionDriversList.extend(
      'redis',
      (config) => new RedisDriver(redis, config.redis!, config.age)
    )
    return
  }
}
