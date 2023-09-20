/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Session } from '../session.js'

/**
 * Events emitted by the session class
 */
declare module '@adonisjs/core/types' {
  interface EventsList {
    'session:initiated': { session: Session }
    'session:committed': { session: Session }
    'session:migrated': { fromSessionId: string; toSessionId: string; session: Session }
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    session: Session
  }
}
