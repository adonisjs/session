/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import { InvalidArgumentsException } from '@poppinss/utils'
import type { CookieOptions } from '@adonisjs/core/types/http'

import type { SessionConfig } from './types/main.js'
import debug from './debug.js'

/**
 * Helper to normalize session config
 */
export function defineConfig(
  config: Partial<SessionConfig>
): SessionConfig & { cookie: Partial<CookieOptions> } {
  /**
   * Make sure a driver is defined
   */
  if (!config.driver) {
    throw new InvalidArgumentsException('Missing "driver" property inside the session config')
  }

  const age = config.age || '2h'
  const clearWithBrowser = config.clearWithBrowser ?? false
  const cookieOptions: Partial<CookieOptions> = { ...config.cookie }

  /**
   * Define maxAge property when session id cookie is
   * not a session cookie.
   */
  if (!clearWithBrowser) {
    debug('computing maxAge for session id cookie')
    cookieOptions.maxAge = string.seconds.parse(config.age || age)
  }

  return {
    enabled: true,
    age,
    clearWithBrowser,
    cookieName: 'adonis_session',
    cookie: cookieOptions,
    driver: config.driver!,
    ...config,
  }
}
