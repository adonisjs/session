/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { setTimeout } from 'node:timers/promises'
import { Database } from '@adonisjs/lucid/database'
import { AppFactory } from '@adonisjs/core/factories/app'
import { LoggerFactory } from '@adonisjs/core/factories/logger'
import { EmitterFactory } from '@adonisjs/core/factories/events'

import { DatabaseStore } from '../../src/stores/database.js'

const sessionId = '1234'

const dbConfig = {
  connection: process.env.DB_CONNECTION || 'sqlite',
  connections: {
    sqlite: {
      client: 'better-sqlite3' as const,
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    },
    postgres: {
      client: 'pg' as const,
      connection: {
        host: process.env.PG_HOST || '0.0.0.0',
        port: Number(process.env.PG_PORT || 5432),
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
        database: process.env.PG_DATABASE || 'session_test',
      },
    },
    mysql: {
      client: 'mysql2' as const,
      connection: {
        host: process.env.MYSQL_HOST || '0.0.0.0',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'root',
        database: process.env.MYSQL_DATABASE || 'session_test',
      },
    },
  },
}

async function createDatabase() {
  const app = new AppFactory().create(new URL('./', import.meta.url), () => {})
  await app.init()

  return new Database(dbConfig, new LoggerFactory().create(), new EmitterFactory().create(app))
}

test.group('Database store', (group) => {
  let db: Database

  group.tap((t) => {
    t.skip(!!process.env.NO_DATABASE, 'Database not available')
  })

  group.setup(async () => {
    db = await createDatabase()

    await db.connection().schema.createTable('sessions', (table) => {
      table.string('id').primary()
      table.text('data').notNullable()
      table.string('user_id').nullable().index()
      table.timestamp('expires_at').notNullable()
    })
  })

  group.each.setup(() => {
    return async () => {
      await db.from('sessions').delete()
    }
  })

  group.teardown(async () => {
    await db.connection().schema.dropTableIfExists('sessions')
    await db.manager.closeAll()
  })

  test('return null when value is missing', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')
    const value = await store.read(sessionId)
    assert.isNull(value)
  })

  test('save session data in database', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')
    await store.write(sessionId, { message: 'hello-world' })

    const row = await db.from('sessions').where('id', sessionId).first()
    assert.exists(row)
    assert.equal(row.id, sessionId)
    assert.exists(row.data)
    assert.exists(row.expires_at)
  })

  test('read session data from database', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')
    await store.write(sessionId, { message: 'hello-world' })

    const value = await store.read(sessionId)
    assert.deepEqual(value, { message: 'hello-world' })
  })

  test('return null when session data is expired', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), 1)
    await store.write(sessionId, { message: 'hello-world' })

    await setTimeout(2000)

    const value = await store.read(sessionId)
    assert.isNull(value)
  }).disableTimeout()

  test('delete expired session from database when reading', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), 1)
    await store.write(sessionId, { message: 'hello-world' })

    await setTimeout(2000)

    await store.read(sessionId)

    const row = await db.from('sessions').where('id', sessionId).first()
    assert.isNull(row)
  }).disableTimeout()

  test('ignore malformed contents', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')
    await db
      .insertQuery()
      .table('sessions')
      .insert({
        id: sessionId,
        data: 'invalid-json',
        expires_at: new Date(Date.now() + 7200000),
      })

    const value = await store.read(sessionId)
    assert.isNull(value)
  })

  test('update existing session on write', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')
    await store.write(sessionId, { message: 'hello-world' })
    await store.write(sessionId, { message: 'updated' })

    const value = await store.read(sessionId)
    assert.deepEqual(value, { message: 'updated' })

    const count = await db.from('sessions').count('* as total')
    assert.equal(count[0].total, 1)
  })

  test('delete session on destroy', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')
    await store.write(sessionId, { message: 'hello-world' })
    await store.destroy(sessionId)

    const row = await db.from('sessions').where('id', sessionId).first()
    assert.isNull(row)
  })

  test('update session expiry on touch', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), 10)
    await store.write(sessionId, { message: 'hello-world' })

    const rowBefore = await db.from('sessions').where('id', sessionId).first()
    const expiryBefore = new Date(rowBefore.expires_at).getTime()

    await setTimeout(2000)

    await store.touch(sessionId)

    const rowAfter = await db.from('sessions').where('id', sessionId).first()
    const expiryAfter = new Date(rowAfter.expires_at).getTime()

    assert.isAbove(expiryAfter, expiryBefore)
  }).disableTimeout()

  test('garbage collection cleans up expired sessions', async ({ assert }) => {
    // Use gcProbability 100 to always trigger garbage collection
    const store = new DatabaseStore(db.connection(), 1, { gcProbability: 100 })

    // Write a session that will expire
    await store.write('expired-session', { message: 'will-expire' })

    await setTimeout(2000)

    // Write another session (this triggers garbage collection)
    await store.write('new-session', { message: 'fresh' })

    // The expired session should have been cleaned up
    const expiredRow = await db.from('sessions').where('id', 'expired-session').first()
    assert.isNull(expiredRow)

    // The new session should still exist
    const newRow = await db.from('sessions').where('id', 'new-session').first()
    assert.exists(newRow)
  }).disableTimeout()

  test('garbage collection does not run when disabled', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), 1, { gcProbability: 0 })

    await store.write('expired-session', { message: 'will-expire' })
    await setTimeout(2000)
    await store.write('new-session', { message: 'fresh' })

    const expiredRow = await db.from('sessions').where('id', 'expired-session').first()
    assert.exists(expiredRow)
  }).disableTimeout()

  test('tag a session with a user id', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')

    await store.write('session-1', { message: 'hello' })
    await store.tag('session-1', 'user-123')

    const row = await db.from('sessions').where('id', 'session-1').first()
    assert.equal(row.user_id, 'user-123')
  })

  test('get sessions tagged with a user id', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')

    await store.write('session-1', { message: 'hello' })
    await store.write('session-2', { message: 'world' })
    await store.write('session-3', { message: 'foo' })

    await store.tag('session-1', 'user-1')
    await store.tag('session-2', 'user-1')
    await store.tag('session-3', 'user-2')

    const user1Sessions = await store.tagged('user-1')
    assert.sameDeepMembers(user1Sessions, [
      { id: 'session-1', data: { message: 'hello' } },
      { id: 'session-2', data: { message: 'world' } },
    ])

    const user2Sessions = await store.tagged('user-2')
    assert.deepEqual(user2Sessions, [{ id: 'session-3', data: { message: 'foo' } }])
  })

  test('return empty array when user has no tagged sessions', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')

    const sessions = await store.tagged('unknown-user')
    assert.deepEqual(sessions, [])
  })

  test('re-tagging updates user id', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), '2 hours')

    await store.write('session-1', { message: 'hello' })
    await store.tag('session-1', 'user-1')
    await store.tag('session-1', 'user-2')

    const row = await db.from('sessions').where('id', 'session-1').first()
    assert.equal(row.user_id, 'user-2')

    const user1Sessions = await store.tagged('user-1')
    assert.deepEqual(user1Sessions, [])

    const user2Sessions = await store.tagged('user-2')
    assert.deepEqual(user2Sessions, [{ id: 'session-1', data: { message: 'hello' } }])
  })

  test('tagged excludes expired sessions', async ({ assert }) => {
    const store = new DatabaseStore(db.connection(), 1, { gcProbability: 0 })

    await store.write('session-1', { message: 'hello' })
    await store.tag('session-1', 'user-1')

    await setTimeout(2000)

    const sessions = await store.tagged('user-1')
    assert.deepEqual(sessions, [])
  }).disableTimeout()
})
