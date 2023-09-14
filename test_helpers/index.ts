/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { getActiveTest } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import { runner } from '@japa/runner/factories'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import type { ApplicationService } from '@adonisjs/core/types'
import { IncomingMessage, ServerResponse, createServer } from 'node:http'
import { Suite, Emitter as JapaEmitter, Refiner, Test, TestContext } from '@japa/runner/core'

import { sessionApiClient } from '../src/plugins/japa/api_client.js'

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

  const suite = new Suite('unit', japaEmitter, refiner)
  suite.add(t)

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
      plugins: [pluginAdonisJS(app), sessionApiClient(app)],
      files: [],
      refiner: refiner,
    })
    .useEmitter(japaEmitter)
    .withSuites([suite])
    .run()
}
