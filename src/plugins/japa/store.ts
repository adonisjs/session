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
 */
export function createTestStore(config: ResolvedSessionConfig): SessionStoreContract {
  const store = config.stores[config.store](null as any, config)
  return store instanceof CookieStore ? new MemoryStore() : store
}
