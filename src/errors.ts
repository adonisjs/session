/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { createError } from '@poppinss/utils'

/**
 * Raised when session store is not mutable
 */
export const E_SESSION_NOT_MUTABLE = createError(
  'Session store is in readonly mode and cannot be mutated',
  'E_SESSION_NOT_MUTABLE',
  500
)

/**
 * Raised when session store has been initiated
 */
export const E_SESSION_NOT_READY = createError(
  'Session store has not been initiated. Make sure you have registered the session middleware',
  'E_SESSION_NOT_READY',
  500
)
