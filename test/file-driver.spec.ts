/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/session.ts" />

import test from 'japa'
import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'

import { FileDriver } from '../src/Drivers/File'
import { sleep, sessionConfig } from '../test-helpers'

const fs = new Filesystem()
const config = Object.assign({}, sessionConfig, {
  driver: 'file',
  file: {
    location: fs.basePath,
  },
})

test.group('File driver', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('return null when file is missing', async (assert) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('write session value to the file', async (assert) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, { message: 'hello-world' })

    const contents = await fs.get('1234.txt')
    assert.deepEqual(JSON.parse(contents), {
      message: { message: 'hello-world' },
      purpose: '1234',
    })
  })

  test('get session existing value', async (assert) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, { message: 'hello-world' })
    const value = await session.read(sessionId)
    assert.deepEqual(value, { message: 'hello-world' })
  })

  test('remove session file', async (assert) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, { message: 'hello-world' })
    await session.destroy(sessionId)

    const exists = await fs.fsExtra.pathExists(join(fs.basePath, '1234.txt'))
    assert.isFalse(exists)
  })

  test('update session expiry', async (assert) => {
    const sessionId = '1234'

    const session = new FileDriver(config)
    await session.write(sessionId, { message: 'hello-world' })
    await sleep(1000)

    const { mtimeMs } = await fs.fsExtra.stat(join(fs.basePath, '1234.txt'))
    assert.isBelow(mtimeMs, Date.now())

    await session.touch(sessionId)
    let { mtimeMs: newMtimeMs } = await fs.fsExtra.stat(join(fs.basePath, '1234.txt'))
    assert.isAbove(newMtimeMs, mtimeMs)
  }).timeout(0)
})
