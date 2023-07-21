/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { join } from 'path'
import { FileDriver } from '../src/drivers/file.js'
import { sleep, sessionConfig, BASE_URL } from '../test_helpers/index.js'
import { fileURLToPath } from 'url'

const config = Object.assign({}, sessionConfig, {
  driver: 'file',
  file: { location: fileURLToPath(BASE_URL) },
})

test.group('File driver', () => {
  test('throws if location is missing', ({ assert }) => {
    // @ts-ignore
    const session = () => new FileDriver({ driver: 'file', file: {} })
    assert.throws(
      session,
      'Missing "file.location" for session file driver inside "config/session" file'
    )
  })

  test('return null when file is missing', async ({ assert }) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('write session value to the file', async ({ assert }) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, { message: 'hello-world' })

    await assert.fileEquals(
      '1234.txt',
      JSON.stringify({ message: { message: 'hello-world' }, purpose: '1234' })
    )
  })

  test('get session existing value', async ({ assert }) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, { message: 'hello-world' })
    const value = await session.read(sessionId)
    assert.deepEqual(value, { message: 'hello-world' })
  })

  test('remove session file', async ({ assert }) => {
    const sessionId = '1234'
    const session = new FileDriver(config)
    await session.write(sessionId, { message: 'hello-world' })
    await session.destroy(sessionId)

    await assert.fileNotExists('1234.txt')
  })

  test('update session expiry', async ({ assert, fs }) => {
    const sessionId = '1234'

    const session = new FileDriver(config)
    await session.write(sessionId, { message: 'hello-world' })
    await sleep(1000)

    const { mtimeMs } = await fs.adapter.stat(join(fs.basePath, '1234.txt'))
    assert.isBelow(mtimeMs, Date.now())

    await session.touch(sessionId)
    let { mtimeMs: newMtimeMs } = await fs.adapter.stat(join(fs.basePath, '1234.txt'))
    assert.isAbove(newMtimeMs, mtimeMs)
  }).timeout(0)
})
