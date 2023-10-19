/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { configProvider } from '@adonisjs/core'
import { RuntimeException } from '@poppinss/utils'
import type { PluginFn } from '@japa/runner/types'
import { decoratorsCollection } from '@japa/browser-client'
import type { ApplicationService } from '@adonisjs/core/types'
import type { CookieOptions as AdonisCookieOptions } from '@adonisjs/core/types/http'

import { SessionClient } from '../../client.js'
import type { SessionConfig, SessionData } from '../../types.js'

declare module 'playwright' {
  export interface BrowserContext {
    sessionClient: SessionClient

    /**
     * Initiate session. The session id cookie will be defined
     * if missing
     */
    initiateSession(options?: Partial<AdonisCookieOptions>): Promise<void>

    /**
     * Returns data from the session store
     */
    getSession(): Promise<any>

    /**
     * Returns data from the session store
     */
    getFlashMessages(): Promise<any>

    /**
     * Set session data
     */
    setSession(values: SessionData): Promise<void>

    /**
     * Set flash messages
     */
    setFlashMessages(values: SessionData): Promise<void>
  }
}

/**
 * Transforming AdonisJS same site option to playwright
 * same site option.
 */
function transformSameSiteOption(sameSite?: AdonisCookieOptions['sameSite']) {
  if (!sameSite) {
    return
  }

  if (sameSite === true || sameSite === 'strict') {
    return 'Strict' as const
  }

  if (sameSite === 'lax') {
    return 'Lax' as const
  }

  if (sameSite === 'none') {
    return 'None' as const
  }
}

/**
 * Transforming AdonisJS session config to playwright cookie options.
 */
function getSessionCookieOptions(
  config: SessionConfig,
  cookieOptions?: Partial<AdonisCookieOptions>
) {
  const options = { ...config.cookie, ...cookieOptions }
  return {
    ...options,
    expires: undefined,
    sameSite: transformSameSiteOption(options.sameSite),
  }
}

/**
 * Hooks AdonisJS Session with the Japa browser client
 * plugin
 */
export const sessionBrowserClient = (app: ApplicationService) => {
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

    decoratorsCollection.register({
      context(context) {
        /**
         * Reference to session client per browser context
         */
        context.sessionClient = new SessionClient(config.stores.memory())

        /**
         * Initiating session store
         */
        context.initiateSession = async function (options) {
          const sessionId = await context.getCookie(config.cookieName)
          if (sessionId) {
            context.sessionClient.sessionId = sessionId
            return
          }

          await context.setCookie(
            config.cookieName,
            context.sessionClient.sessionId,
            getSessionCookieOptions(config, options)
          )
        }

        /**
         * Returns session data
         */
        context.getSession = async function () {
          await context.initiateSession()
          const sessionData = await context.sessionClient.load()
          return sessionData.values
        }

        /**
         * Returns flash messages from the data store
         */
        context.getFlashMessages = async function () {
          await context.initiateSession()
          const sessionData = await context.sessionClient.load()
          return sessionData.flashMessages
        }

        /**
         * Set session data
         */
        context.setSession = async function (values) {
          await context.initiateSession()
          context.sessionClient.merge(values)
          await context.sessionClient.commit()
        }

        /**
         * Set flash messages
         */
        context.setFlashMessages = async function (values) {
          await context.initiateSession()
          context.sessionClient.flash(values)
          await context.sessionClient.commit()
        }

        /**
         * Destroy session when context is closed
         */
        context.on('close', async function () {
          await context.sessionClient.destroy()
        })
      },
    })
  }

  return pluginFn
}
