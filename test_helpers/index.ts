/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { getActiveTest } from '@japa/runner'
import type { Test } from '@japa/runner/core'
import { browserClient } from '@japa/browser-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { ApiClient, apiClient } from '@japa/api-client'
import { NamedReporterContract } from '@japa/runner/types'
import { runner, syncReporter } from '@japa/runner/factories'
import type { ApplicationService } from '@adonisjs/core/types'
import { IncomingMessage, ServerResponse, createServer } from 'node:http'

import { sessionApiClient } from '../src/plugins/japa/api_client.js'
import { sessionBrowserClient } from '../src/plugins/japa/browser_client.js'

export const httpServer = {
  create(callback: (req: IncomingMessage, res: ServerResponse) => any) {
    const server = createServer(callback)
    getActiveTest()?.cleanup(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    })
    return server
  },
}

/**
 * Runs a japa test in isolation
 */
export async function runJapaTest(app: ApplicationService, callback: Parameters<Test['run']>[0]) {
  ApiClient.clearSetupHooks()
  ApiClient.clearTeardownHooks()
  ApiClient.clearRequestHandlers()

  await runner()
    .configure({
      reporters: {
        activated: [syncReporter.name],
        list: [syncReporter as NamedReporterContract],
      },
      plugins: [
        apiClient(),
        browserClient({}),
        pluginAdonisJS(app),
        sessionApiClient(app),
        sessionBrowserClient(app),
      ],
      files: [],
    })
    .runTest('testing japa integration', callback)
}
