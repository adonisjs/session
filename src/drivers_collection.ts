/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/utils'

import type { SessionDriversList } from './types/main.js'

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
    ...args: Parameters<SessionDriversList[Name]>
  ): ReturnType<SessionDriversList[Name]> {
    const driverFactory = this.list[name]
    if (!driverFactory) {
      throw new RuntimeException(
        `Unknown session driver "${String(name)}". Make sure the driver is registered`
      )
    }

    return driverFactory(args[0], args[1]!) as ReturnType<SessionDriversList[Name]>
  }
}

const sessionDriversList = new SessionDriversCollection()
export default sessionDriversList
