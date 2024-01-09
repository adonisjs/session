/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'
import { configProvider } from '@adonisjs/core'
import { RuntimeException } from '@poppinss/utils'
import type { PluginFn } from '@japa/runner/types'
import type { ApplicationService } from '@adonisjs/core/types'
import { ApiClient, ApiRequest, ApiResponse } from '@japa/api-client'

import { SessionClient } from '../../client.js'
import type { SessionData } from '../../types.js'

declare module '@japa/api-client' {
  export interface ApiRequest {
    sessionClient: SessionClient

    /**
     * Make HTTP request along with the provided session data
     */
    withSession(values: SessionData): this

    /**
     * Make HTTP request along with the provided session flash
     * messages.
     */
    withFlashMessages(values: SessionData): this
  }

  export interface ApiResponse {
    sessionBag: {
      values: SessionData
      flashMessages: SessionData
    }

    /**
     * Get session data from the HTTP response
     */
    session(key?: string): any

    /**
     * Get flash messages from the HTTP response
     */
    flashMessages(): SessionData

    /**
     * Get flash messages for a specific key from the HTTP response
     */
    flashMessage(key: string): SessionData

    /**
     * Assert session key-value pair exists
     */
    assertSession(key: string, value?: any): void

    /**
     * Assert key is missing in session store
     */
    assertSessionMissing(key: string): void

    /**
     * Assert flash message key-value pair exists
     */
    assertFlashMessage(key: string, value?: any): void

    /**
     * Assert key is missing flash messages store
     */
    assertFlashMissing(key: string): void

    /**
     * Assert flash messages has validation errors for
     * the given field
     */
    assertHasValidationError(field: string): void

    /**
     * Assert flash messages does not have validation errors
     * for the given field
     */
    assertDoesNotHaveValidationError(field: string): void

    /**
     * Assert error message for a given field
     */
    assertValidationError(field: string, message: string): void

    /**
     * Assert all error messages for a given field
     */
    assertValidationErrors(field: string, messages: string[]): void
  }
}

/**
 * Hooks AdonisJS Session with the Japa API client
 * plugin
 */
export const sessionApiClient = (app: ApplicationService) => {
  const pluginFn: PluginFn = async function () {
    const sessionConfigProvider = app.config.get('session', {})

    /**
     * Resolve config from the provider
     */
    const config = await configProvider.resolve<any>(app, sessionConfigProvider)
    if (!config) {
      throw new RuntimeException(
        'Invalid "config/session.ts" file. Make sure you are using the "defineConfig" method'
      )
    }

    /**
     * Stick an singleton session client to APIRequest. The session
     * client is used to keep a track of session data we have
     * to send during the request.
     */
    ApiRequest.getter(
      'sessionClient',
      function () {
        return new SessionClient(config.stores.memory())
      },
      true
    )

    /**
     * Define session data
     */
    ApiRequest.macro('withSession', function (this: ApiRequest, data) {
      this.sessionClient.merge(data)
      return this
    })

    /**
     * Define flash messages
     */
    ApiRequest.macro('withFlashMessages', function (this: ApiRequest, data) {
      this.sessionClient.flash(data)
      return this
    })

    /**
     * Get session data
     */
    ApiResponse.macro('session', function (this: ApiResponse, key) {
      return key ? lodash.get(this.sessionBag.values, key) : this.sessionBag.values
    })

    /**
     * Get flash messages
     */
    ApiResponse.macro('flashMessages', function (this: ApiResponse) {
      return this.sessionBag.flashMessages
    })
    ApiResponse.macro('flashMessage', function (this: ApiResponse, key) {
      return lodash.get(this.sessionBag.flashMessages, key)
    })

    /**
     * Response session assertions
     */
    ApiResponse.macro('assertSession', function (this: ApiResponse, key, value) {
      this.assert!.property(this.session(), key)
      if (value !== undefined) {
        this.assert!.deepEqual(this.session(key), value)
      }
    })
    ApiResponse.macro('assertSessionMissing', function (this: ApiResponse, key) {
      this.assert!.notProperty(this.session(), key)
    })
    ApiResponse.macro('assertFlashMessage', function (this: ApiResponse, key, value) {
      this.assert!.property(this.flashMessages(), key)
      if (value !== undefined) {
        this.assert!.deepEqual(this.flashMessage(key), value)
      }
    })
    ApiResponse.macro('assertFlashMissing', function (this: ApiResponse, key) {
      this.assert!.notProperty(this.flashMessages(), key)
    })
    ApiResponse.macro('assertHasValidationError', function (this: ApiResponse, field) {
      this.assert!.property(this.flashMessage('errors'), field)
    })
    ApiResponse.macro('assertDoesNotHaveValidationError', function (this: ApiResponse, field) {
      this.assert!.notProperty(this.flashMessage('errors'), field)
    })
    ApiResponse.macro('assertValidationError', function (this: ApiResponse, field, message) {
      this.assert!.include(this.flashMessage('errors')?.[field] || [], message)
    })
    ApiResponse.macro('assertValidationErrors', function (this: ApiResponse, field, messages) {
      this.assert!.deepEqual(this.flashMessage('errors')?.[field] || [], messages)
    })

    /**
     * We define the hook using the "request.setup" method because we
     * want to allow other Japa hooks to mutate the session store
     * without running into race conditions
     */
    ApiClient.onRequest((request) => {
      request.setup(async () => {
        /**
         * Set cookie
         */
        request.withCookie(config.cookieName, request.sessionClient.sessionId)

        /**
         * Persist data
         */
        await request.sessionClient.commit()

        /**
         * Cleanup if request fails
         */
        return async (error: any) => {
          if (error) {
            await request.sessionClient.destroy()
          }
        }
      })

      request.teardown(async (response) => {
        const sessionId = response.cookie(config.cookieName)

        /**
         * Reading session data from the response cookie
         */
        response.sessionBag = sessionId
          ? await response.request.sessionClient.load(sessionId.value)
          : {
              values: {},
              flashMessages: {},
            }

        /**
         * Cleanup state
         */
        await request.sessionClient.destroy(sessionId?.value)
      })
    })
  }

  return pluginFn
}
