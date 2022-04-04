/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import '@japa/api-client'
import { AllowedSessionValues, SessionClientContract } from '@ioc:Adonis/Addons/Session'

declare module '@japa/api-client' {
  export interface ApiRequest {
    sessionClient: SessionClientContract

    /**
     * Send session values in the request
     */
    session(session: Record<string, AllowedSessionValues>): this

    /**
     * Send flash messages in the request
     */
    flashMessages(messages: Record<string, AllowedSessionValues>): this
  }

  export interface ApiResponse {
    /**
     * A copy of session data loaded from the driver
     */
    sessionJar: {
      session: Record<string, any>
      flashMessages: Record<string, any> | null
    }

    /**
     * Get session data
     */
    session(): Record<string, any>

    /**
     * Get flash messages set by the server
     */
    flashMessages(): Record<string, any>

    /**
     * Assert response to contain a given session and optionally
     * has the expected value
     */
    assertSession(key: string, value?: any): void

    /**
     * Assert response to not contain a given session
     */
    assertSessionMissing(key: string): void

    /**
     * Assert response to contain a given flash message and optionally
     * has the expected value
     */
    assertFlashMessage(key: string, value?: any): void

    /**
     * Assert response to not contain a given session
     */
    assertFlashMissing(key: string): void
  }
}
