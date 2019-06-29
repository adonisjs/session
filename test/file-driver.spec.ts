/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/session.ts" />

import * as test from 'japa'
import { Filesystem } from '@poppinss/dev-utils'
import { SessionConfigContract } from '@ioc:Adonis/Addons/Session'
import { join } from 'path'

import { FileDriver } from '../src/Drivers/File'
const fs = new Filesystem()

const config: SessionConfigContract = {
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: 3000,
  file: {
    location: fs.basePath,
  },
}

test.group('File driver', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('return empty string when file is missing', async (assert) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    const value = await session.read(sessionId)
    assert.equal(value, '')
  })

  test('write session value to the file', async (assert) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, 'hello-world')

    const contents = await fs.get('1234.txt')
    assert.equal(contents.trim(), 'hello-world')
  })

  test('get session existing value', async (assert) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, 'hello-world')
    const value = await session.read(sessionId)
    assert.equal(value, 'hello-world')
  })

  test('remove session file', async (assert) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, 'hello-world')
    await session.destroy(sessionId)

    const exists = await fs.fsExtra.exists(join(fs.basePath, '1234.txt'))
    assert.isFalse(exists)
  })
})
