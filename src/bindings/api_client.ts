/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApiRequest, ApiResponse, ApiClient } from '@japa/api-client'
import { InspectOptions, inspect } from 'node:util'
import { SessionManager } from '../session_manager.js'
import { AllowedSessionValues } from '../types.js'

export function extendApiClient(sessionManager: SessionManager) {
  /**
   * Set "sessionClient" on the api request
   */
  ApiRequest.getter(
    'sessionClient',
    function () {
      return sessionManager.client()
    },
    true
  )

  /**
   * Send session values in the request
   */
  ApiRequest.macro(
    'session',
    function (this: ApiRequest, session: Record<string, AllowedSessionValues>) {
      if (!this.sessionClient.isEnabled()) {
        throw new Error('Cannot set session. Make sure to enable it inside "config/session" file')
      }

      this.sessionClient.merge(session)

      return this
    }
  )

  /**
   * Send flash messages in the request
   */
  ApiRequest.macro(
    'flashMessages',
    function (this: ApiRequest, messages: Record<string, AllowedSessionValues>) {
      if (!this.sessionClient.isEnabled()) {
        throw new Error(
          'Cannot set flash messages. Make sure to enable the session inside "config/session" file'
        )
      }

      this.sessionClient.flashMessages.merge(messages)
      return this
    }
  )

  /**
   * Returns reference to the session data from the session
   * jar
   */
  ApiResponse.macro('session', function (this: ApiResponse) {
    return this.sessionJar.session
  })

  /**
   * Returns reference to the flash messages from the session
   * jar
   */
  ApiResponse.macro('flashMessages', function (this: ApiResponse) {
    return this.sessionJar.flashMessages || {}
  })

  /**
   * Assert response to contain a given session and optionally
   * has the expected value
   */
  ApiResponse.macro('assertSession', function (this: ApiResponse, name: string, value?: any) {
    this.ensureHasAssert()
    this.assert!.property(this.session(), name)

    if (value !== undefined) {
      this.assert!.deepEqual(this.session()[name], value)
    }
  })

  /**
   * Assert response to not contain a given session
   */
  ApiResponse.macro('assertSessionMissing', function (this: ApiResponse, name: string) {
    this.ensureHasAssert()
    this.assert!.notProperty(this.session(), name)
  })

  /**
   * Assert response to contain a given flash message and optionally
   * has the expected value
   */
  ApiResponse.macro('assertFlashMessage', function (this: ApiResponse, name: string, value?: any) {
    this.ensureHasAssert()
    this.assert!.property(this.flashMessages(), name)

    if (value !== undefined) {
      this.assert!.deepEqual(this.flashMessages()[name], value)
    }
  })

  /**
   * Assert response to not contain a given session
   */
  ApiResponse.macro('assertFlashMissing', function (this: ApiResponse, name: string) {
    this.ensureHasAssert()
    this.assert!.notProperty(this.flashMessages(), name)
  })

  /**
   * Dump session to the console
   */
  ApiResponse.macro('dumpSession', function (this: ApiResponse, options?: InspectOptions) {
    const inspectOptions = { depth: 2, showHidden: false, colors: true, ...options }
    console.log(`"session"        => ${inspect(this.session(), inspectOptions)}`)
    console.log(`"flashMessages"  => ${inspect(this.flashMessages(), inspectOptions)}`)

    return this
  })

  /**
   * Adding hooks directly on the request object moves the hooks to
   * the end of the queue (basically after the globally hooks)
   */
  ApiClient.onRequest((req) => {
    /**
     * Hook into request and persist session data to be available
     * on the server during the request.
     */
    req.setup(async (request) => {
      /**
       * Persist session data and set the session id within the
       * cookie
       */
      const { cookieName, sessionId } = await request.sessionClient.commit()
      request.withCookie(cookieName, sessionId)

      /**
       * Cleanup if request has error. Otherwise the teardown
       * hook will clear
       */
      return async (error: any) => {
        if (error) {
          await request.sessionClient.forget()
        }
      }
    })

    /**
     * Load messages from the session store and keep a reference to it
     * inside the response object.
     *
     * We also destroy the session after getting a copy of the session
     * data
     */
    req.teardown(async (response) => {
      response.sessionJar = await response.request.sessionClient.load(response.cookies())
      await response.request.sessionClient.forget()
    })
  })
}
