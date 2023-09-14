/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { getActiveTest } from '@japa/runner'
import { runner } from '@japa/runner/factories'
import { browserClient } from '@japa/browser-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { ApiClient, apiClient } from '@japa/api-client'
import type { ApplicationService } from '@adonisjs/core/types'
import { IncomingMessage, ServerResponse, createServer } from 'node:http'
import { Suite, Emitter as JapaEmitter, Refiner, Test, TestContext } from '@japa/runner/core'

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

  const japaEmitter = new JapaEmitter()
  const refiner = new Refiner()

  const t = new Test('make api request', (self) => new TestContext(self), japaEmitter, refiner)
  t.run(callback)

  const unit = new Suite('unit', japaEmitter, refiner)

  await runner()
    .configure({
      reporters: {
        activated: ['sync'],
        list: [
          {
            name: 'sync',
            handler(r, emitter) {
              emitter.on('runner:end', function () {
                const summary = r.getSummary()
                if (summary.hasError) {
                  throw summary.failureTree[0].children[0].errors[0].error
                }
              })
            },
          },
        ],
      },
      plugins: [
        apiClient(),
        browserClient({ runInSuites: ['unit'] }),
        pluginAdonisJS(app),
        sessionApiClient(app),
        sessionBrowserClient(app),
        ({ runner: r }) => {
          r.onSuite((suite) => {
            suite.add(t)
          })
        },
      ],
      files: [],
      refiner: refiner,
    })
    .useEmitter(japaEmitter)
    .withSuites([unit])
    .run()
}
