/*
 * @adonisjs/redis
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/utils'
import type { HttpContext } from '@adonisjs/core/http'

import type { SessionDriversList } from './types.js'

/**
 * A global collection of session drivers
 */
class SessionDriversCollection {
  /**
   * List of registered drivers
   */
  list: Partial<SessionDriversList> = {}

  /**
   * Extend drivers collection and add a custom
   * driver to it.
   */
  extend<Name extends keyof SessionDriversList>(
    driverName: Name,
    factoryCallback: SessionDriversList[Name]
  ): this {
    this.list[driverName] = factoryCallback
    return this
  }

  /**
   * Creates the driver instance with config
   */
  create<Name extends keyof SessionDriversList>(
    name: Name,
    config: Parameters<SessionDriversList[Name]>[0],
    ctx: HttpContext
  ): ReturnType<SessionDriversList[Name]> {
    const driverFactory = this.list[name]
    if (!driverFactory) {
      throw new RuntimeException(
        `Unknown redis driver "${String(name)}". Make sure the driver is registered`
      )
    }

    return driverFactory(config as any, ctx) as ReturnType<SessionDriversList[Name]>
  }
}

const sessionDriversList = new SessionDriversCollection()
export default sessionDriversList
