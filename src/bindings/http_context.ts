/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { HttpContext } from '@adonisjs/core/http'
import { SessionManager } from '../session_manager.js'

/**
 * Extends HttpContext class with the ally getter
 */
export function extendHttpContext(session: SessionManager) {
  HttpContext.getter(
    'session',
    function (this: HttpContext) {
      return session.create(this)
    },
    true
  )
}
