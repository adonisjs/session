/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { SessionData, SessionStoreContract } from '../types.ts'

/**
 * Memory store is meant to be used for writing tests.
 * All session data is stored in memory and will be lost when the process restarts.
 *
 * @example
 * const memoryStore = new MemoryStore()
 * memoryStore.write('sess_abc123', { userId: 123 })
 */
export class MemoryStore implements SessionStoreContract {
  /**
   * Static map to store all session data in memory
   */
  static sessions: Map<string, SessionData> = new Map()

  /**
   * Reads session value from memory
   *
   * @param sessionId - Session identifier
   *
   * @example
   * const data = store.read('sess_abc123')
   */
  read(sessionId: string): SessionData | null {
    return MemoryStore.sessions.get(sessionId) || null
  }

  /**
   * Saves session value in memory for a given session id
   *
   * @param sessionId - Session identifier
   * @param values - Session data to store
   *
   * @example
   * store.write('sess_abc123', { userId: 123, theme: 'dark' })
   */
  write(sessionId: string, values: SessionData): void {
    MemoryStore.sessions.set(sessionId, values)
  }

  /**
   * Removes a single session from memory
   *
   * @param sessionId - Session identifier to remove
   *
   * @example
   * store.destroy('sess_abc123')
   */
  destroy(sessionId: string): void {
    MemoryStore.sessions.delete(sessionId)
  }

  /**
   * No-op for memory store as there's no expiry mechanism
   *
   * @param sessionId - Session identifier (unused)
   */
  touch(_?: string): void {}
}
