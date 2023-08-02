/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { ApplicationService } from '@adonisjs/core/types'
import { AppFactory } from '@adonisjs/core/factories/app'

import { MemoryDriver } from '../src/drivers/memory.js'
import { registerSessionDriver } from '../src/helpers.js'
import sessionDriversList from '../src/drivers_collection.js'

test.group('Drivers collection', () => {
  test('raise error when trying to access a non-existing driver', () => {
    sessionDriversList.create('cookie', {} as any, {} as any)
  }).throws('Unknown session driver "cookie". Make sure the driver is registered')

  test('create driver instance when exists', async ({ assert }) => {
    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService

    await registerSessionDriver(app, 'memory')
    assert.instanceOf(sessionDriversList.create('memory', {} as any, {} as any), MemoryDriver)
  })
})
