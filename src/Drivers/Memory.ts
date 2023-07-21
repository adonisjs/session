/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { SessionDriverContract } from '../types.js'

/**
 * Memory driver is meant to be used for writing tests.
 */
export class MemoryDriver implements SessionDriverContract {
  static sessions: Map<string, Object> = new Map()

  /**
   * Read session id value from the memory
   */
  read(sessionId: string): { [key: string]: any } | null {
    return MemoryDriver.sessions.get(sessionId) || null
  }

  /**
   * Save in memory value for a given session id
   */
  write(sessionId: string, values: { [key: string]: any }): void {
    if (typeof values !== 'object') {
      throw new Error('Session memory driver expects an object of values')
    }

    MemoryDriver.sessions.set(sessionId, values)
  }

  /**
   * Cleanup for a single session
   */
  destroy(sessionId: string): void {
    MemoryDriver.sessions.delete(sessionId)
  }

  touch(): void {}
}
