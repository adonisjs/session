/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { SessionData, SessionDriverContract } from '../types.js'

/**
 * Memory driver is meant to be used for writing tests.
 */
export class MemoryDriver implements SessionDriverContract {
  static sessions: Map<string, SessionData> = new Map()

  /**
   * Read session id value from the memory
   */
  read(sessionId: string): SessionData | null {
    return MemoryDriver.sessions.get(sessionId) || null
  }

  /**
   * Save in memory value for a given session id
   */
  write(sessionId: string, values: SessionData): void {
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
