/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { MemoryStore } from '../../stores/memory.ts'
import { CookieStore } from '../../stores/cookie.ts'
import type { ResolvedSessionConfig, SessionStoreContract } from '../../types.ts'

/**
 * Creates the store the test clients write sessions to: the store the
 * application reads them from. The cookie store needs an HTTP request,
 * so the clients fall back to the memory store for it.
 *
 * A store serves one request and remembers the sessions it read, which
 * changes how it writes them later. Each call gets a new store, so a
 * client that read a session can still write it after a logout.
 */
export function createTestStore(config: ResolvedSessionConfig): SessionStoreContract {
  const createStore = () => {
    const store = config.stores[config.store](null as any, config)
    return store instanceof CookieStore ? new MemoryStore() : store
  }

  return {
    read: (sessionId) => createStore().read(sessionId),
    write: (sessionId, data) => createStore().write(sessionId, data),
    destroy: (sessionId) => createStore().destroy(sessionId),
    touch: (sessionId) => createStore().touch(sessionId),
  }
}
