/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { createError } from '@adonisjs/core/exceptions'

/**
 * Error thrown when attempting to mutate a readonly session store.
 * This occurs when trying to write to a session that was initiated in readonly mode.
 *
 * @example
 * // This will throw E_SESSION_NOT_MUTABLE
 * await session.initiate(true) // readonly mode
 * session.put('key', 'value')  // Throws error
 */
export const E_SESSION_NOT_MUTABLE = createError(
  'Session store is in readonly mode and cannot be mutated',
  'E_SESSION_NOT_MUTABLE',
  500
)

/**
 * Error thrown when attempting to use session before it's been initiated.
 * This usually means the session middleware hasn't been registered or called.
 *
 * @example
 * // This will throw E_SESSION_NOT_READY
 * const session = new Session(config, storeFactory, emitter, ctx)
 * session.put('key', 'value') // Throws error - need to call initiate first
 *
 * // Correct usage:
 * await session.initiate(false)
 * session.put('key', 'value') // Works fine
 */
export const E_SESSION_NOT_READY = createError(
  'Session store has not been initiated. Make sure you have registered the session middleware',
  'E_SESSION_NOT_READY',
  500
)
