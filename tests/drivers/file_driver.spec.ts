/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { stat } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

import { FileDriver } from '../../src/drivers/file.js'

test.group('File driver', () => {
  test('do not create file for a new session', async ({ fs, assert }) => {
    const sessionId = '1234'
    const session = new FileDriver({ location: fs.basePath }, '2 hours')

    const value = await session.read(sessionId)
    assert.isNull(value)

    await assert.fileNotExists('1234.txt')
  })

  test('create intermediate directories when missing', async ({ fs, assert }) => {
    const sessionId = '1234'
    const session = new FileDriver(
      {
        location: join(fs.basePath, 'app/sessions'),
      },
      '2 hours'
    )

    await session.write(sessionId, { message: 'hello-world' })

    await assert.fileExists('app/sessions/1234.txt')
    await assert.fileEquals(
      'app/sessions/1234.txt',
      JSON.stringify({ message: { message: 'hello-world' }, purpose: '1234' })
    )
  })

  test('update existing session', async ({ fs, assert }) => {
    const sessionId = '1234'
    const session = new FileDriver(
      {
        location: fs.basePath,
      },
      '2 hours'
    )

    await session.write(sessionId, { message: 'hello-world' })
    await assert.fileEquals(
      '1234.txt',
      JSON.stringify({ message: { message: 'hello-world' }, purpose: '1234' })
    )

    await session.write(sessionId, { message: 'hi-world' })
    await assert.fileEquals(
      '1234.txt',
      JSON.stringify({ message: { message: 'hi-world' }, purpose: '1234' })
    )
  })

  test('get session existing value', async ({ assert, fs }) => {
    const sessionId = '1234'
    const session = new FileDriver({ location: fs.basePath }, '2 hours')
    await session.write(sessionId, { message: 'hello-world' })

    const value = await session.read(sessionId)
    assert.deepEqual(value, { message: 'hello-world' })
  })

  test('return null when session data is expired', async ({ assert, fs }) => {
    const sessionId = '1234'
    const session = new FileDriver({ location: fs.basePath }, 1000)
    await session.write(sessionId, { message: 'hello-world' })

    await setTimeout(2000)

    const value = await session.read(sessionId)
    assert.isNull(value)
  }).disableTimeout()

  test('ignore malformed file contents', async ({ fs, assert }) => {
    const sessionId = '1234'
    const session = new FileDriver({ location: fs.basePath }, '2 hours')

    await fs.create('1234.txt', '')
    assert.isNull(await session.read(sessionId))

    await fs.create('1234.txt', 'foo')
    assert.isNull(await session.read(sessionId))

    await fs.create('1234.txt', JSON.stringify({ foo: 'bar' }))
    assert.isNull(await session.read(sessionId))
  })

  test('remove file on destroy', async ({ assert, fs }) => {
    const sessionId = '1234'

    const session = new FileDriver({ location: fs.basePath }, '2 hours')
    await session.write(sessionId, { message: 'hello-world' })
    await session.destroy(sessionId)

    await assert.fileNotExists('1234.txt')
  })

  test('do not fail when destroying a non-existing session', async ({ assert, fs }) => {
    const sessionId = '1234'

    await assert.fileNotExists('1234.txt')

    const session = new FileDriver({ location: fs.basePath }, '2 hours')
    await session.destroy(sessionId)

    await assert.fileNotExists('1234.txt')
  })

  test('update session expiry on touch', async ({ assert, fs }) => {
    const sessionId = '1234'

    const session = new FileDriver({ location: fs.basePath }, '2 hours')
    await session.write(sessionId, { message: 'hello-world' })

    /**
     * Waiting a bit
     */
    await setTimeout(2000)

    /**
     * Making sure the original mTime of the file was smaller
     * than the current time after wait
     */
    const { mtimeMs } = await stat(join(fs.basePath, '1234.txt'))
    assert.isBelow(mtimeMs, Date.now())

    await session.touch(sessionId)

    /**
     * Ensuring the new mTime is greater than the old mTime
     */
    let { mtimeMs: newMtimeMs } = await stat(join(fs.basePath, '1234.txt'))
    assert.isAbove(newMtimeMs, mtimeMs)

    await assert.fileEquals(
      '1234.txt',
      JSON.stringify({ message: { message: 'hello-world' }, purpose: '1234' })
    )
  }).disableTimeout()
})
