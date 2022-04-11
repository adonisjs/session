/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { ContainerBindings } from '@ioc:Adonis/Core/Application'
import { SessionManagerContract, AllowedSessionValues } from '@ioc:Adonis/Addons/Session'

/**
 * Define test bindings
 */
export function defineTestsBindings(
  ApiRequest: ContainerBindings['Japa/Preset/ApiRequest'],
  ApiResponse: ContainerBindings['Japa/Preset/ApiResponse'],
  ApiClient: ContainerBindings['Japa/Preset/ApiClient'],
  SessionManager: SessionManagerContract
) {
  /**
   * Set "sessionClient" on the api request
   */
  ApiRequest.getter(
    'sessionClient',
    function () {
      return SessionManager.client()
    },
    true
  )

  /**
   * Send session values in the request
   */
  ApiRequest.macro('session', function (session: Record<string, AllowedSessionValues>) {
    if (!this.sessionClient.isEnabled()) {
      throw new Error('Cannot set session. Make sure to enable it inside "config/session" file')
    }

    this.sessionClient.merge(session)
    return this
  })

  /**
   * Send flash messages in the request
   */
  ApiRequest.macro('flashMessages', function (messages: Record<string, AllowedSessionValues>) {
    if (!this.sessionClient.isEnabled()) {
      throw new Error(
        'Cannot set flash messages. Make sure to enable the session inside "config/session" file'
      )
    }

    this.sessionClient.flashMessages.merge(messages)
    return this
  })

  /**
   * Returns reference to the session data from the session
   * jar
   */
  ApiResponse.macro('session', function () {
    return this.sessionJar.session
  })

  /**
   * Returns reference to the flash messages from the session
   * jar
   */
  ApiResponse.macro('flashMessages', function () {
    return this.sessionJar.flashMessages || {}
  })

  /**
   * Assert response to contain a given session and optionally
   * has the expected value
   */
  ApiResponse.macro('assertSession', function (name: string, value?: any) {
    this.ensureHasAssert()
    this.assert!.property(this.session(), name)

    if (value !== undefined) {
      this.assert!.deepEqual(this.session()[name], value)
    }
  })

  /**
   * Assert response to not contain a given session
   */
  ApiResponse.macro('assertSessionMissing', function (name: string) {
    this.ensureHasAssert()
    this.assert!.notProperty(this.session(), name)
  })

  /**
   * Assert response to contain a given flash message and optionally
   * has the expected value
   */
  ApiResponse.macro('assertFlashMessage', function (name: string, value?: any) {
    this.ensureHasAssert()
    this.assert!.property(this.flashMessages(), name)

    if (value !== undefined) {
      this.assert!.deepEqual(this.flashMessages()[name], value)
    }
  })

  /**
   * Assert response to not contain a given session
   */
  ApiResponse.macro('assertFlashMissing', function (name: string) {
    this.ensureHasAssert()
    this.assert!.notProperty(this.flashMessages(), name)
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
      request.cookie(cookieName, sessionId)

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
      response.sessionJar = await response.request.sessionClient.load()
      await response.request.sessionClient.forget()
    })
  })
}
