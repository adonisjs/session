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
import { marshall } from '@aws-sdk/util-dynamodb'
import { PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb'

import { DynamoDBStore } from '../../src/stores/dynamodb.ts'
import { dynamodbClient, getExpiry, getSession } from '../../tests_helpers/index.ts'

const sessionId = '1234'
const defaultTableName = 'Session'
const defaultKeyName = 'key'
const customKeyAttribute = 'sessionId'
const customTableName = 'CustomKeySession'
const client = dynamodbClient.create()

test.group('DynamoDB store', (group) => {
  group.tap((t) => {
    t.skip(!!process.env.NO_DYNAMODB, 'DynamoDB not available in this environment')
  })

  group.each.setup(() => {
    return async () => {
      await client.send(
        new DeleteItemCommand({
          TableName: defaultTableName,
          Key: marshall({ [defaultKeyName]: sessionId }),
        })
      )
    }
  })

  test('return null when value is missing', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours')

    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('get session existing value', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours')
    await session.write(sessionId, { message: 'hello-world' })

    const value = await session.read(sessionId)
    assert.deepEqual(value, { message: 'hello-world' })
  })

  test('return null when session data is expired', async ({ assert }) => {
    const session = new DynamoDBStore(client, 1)
    await session.write(sessionId, { message: 'hello-world' })

    await setTimeout(2000)

    const value = await session.read(sessionId)
    assert.isNull(value)
  }).timeout(3000)

  test('ignore malformed contents', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours')

    await client.send(
      new PutItemCommand({
        TableName: defaultTableName,
        Item: { [defaultKeyName]: marshall(sessionId), value: marshall('foo') },
      })
    )

    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('ignore items with missing value attribute', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours')

    await client.send(
      new PutItemCommand({
        TableName: defaultTableName,
        Item: { [defaultKeyName]: marshall(sessionId) },
      })
    )

    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('delete key on destroy', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours')

    await session.write(sessionId, { message: 'hello-world' })
    await session.destroy(sessionId)

    const storedValue = await getSession(client, defaultTableName, defaultKeyName, sessionId)
    assert.isNull(storedValue)
  })

  test('update session expiry on touch', async ({ assert }) => {
    const session = new DynamoDBStore(client, 10)

    await session.write(sessionId, { message: 'hello-world' })
    const expiry = await getExpiry(client, defaultTableName, defaultKeyName, sessionId)

    /**
     * Waiting a bit
     */
    await setTimeout(2000)

    /**
     * Update the expiry
     */
    await session.touch(sessionId)

    /**
     * Ensuring the new expiry time is greater than the old expiry time
     */
    const expiryPostTouch = await getExpiry(client, defaultTableName, defaultKeyName, sessionId)
    assert.isAbove(expiryPostTouch, expiry)
  }).timeout(3000)
})

test.group('DynamoDB store | Custom table name', (group) => {
  group.tap((t) => {
    t.skip(!!process.env.NO_DYNAMODB, 'DynamoDB not available in this environment')
  })

  group.each.setup(() => {
    return async () => {
      await client.send(
        new DeleteItemCommand({
          TableName: customTableName,
          Key: marshall({ [customKeyAttribute]: sessionId }),
        })
      )
    }
  })

  test('return null when value is missing', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours', {
      tableName: customTableName,
      keyAttribute: customKeyAttribute,
    })

    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('get session existing value', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours', {
      tableName: customTableName,
      keyAttribute: customKeyAttribute,
    })

    await session.write(sessionId, { message: 'hello-world' })

    const value = await session.read(sessionId)
    assert.deepEqual(value, { message: 'hello-world' })
  })

  test('return null when session data is expired', async ({ assert }) => {
    const session = new DynamoDBStore(client, 1, {
      tableName: customTableName,
      keyAttribute: customKeyAttribute,
    })

    await session.write(sessionId, { message: 'hello-world' })

    await setTimeout(2000)

    const value = await session.read(sessionId)
    assert.isNull(value)
  }).timeout(3000)

  test('ignore malformed contents', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours', {
      tableName: customTableName,
      keyAttribute: customKeyAttribute,
    })

    await client.send(
      new PutItemCommand({
        TableName: customTableName,
        Item: { [customKeyAttribute]: marshall(sessionId), value: marshall('foo') },
      })
    )

    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('ignore items with missing value attribute', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours', {
      tableName: customTableName,
      keyAttribute: customKeyAttribute,
    })

    await client.send(
      new PutItemCommand({
        TableName: customTableName,
        Item: { [customKeyAttribute]: marshall(sessionId) },
      })
    )

    const value = await session.read(sessionId)
    assert.isNull(value)
  })

  test('delete key on destroy', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours', {
      tableName: customTableName,
      keyAttribute: customKeyAttribute,
    })

    await session.write(sessionId, { message: 'hello-world' })
    await session.destroy(sessionId)

    const storedValue = await getSession(client, customTableName, customKeyAttribute, sessionId)
    assert.isNull(storedValue)
  })

  test('update session expiry on touch', async ({ assert }) => {
    const session = new DynamoDBStore(client, '2 hours', {
      tableName: customTableName,
      keyAttribute: customKeyAttribute,
    })

    await session.write(sessionId, { message: 'hello-world' })
    const expiry = await getExpiry(client, customTableName, customKeyAttribute, sessionId)

    /**
     * Waiting a bit
     */
    await setTimeout(2000)

    /**
     * Update the expiry
     */
    await session.touch(sessionId)

    /**
     * Ensuring the new expiry time is greater than the old expiry time
     */
    const expiryPostTouch = await getExpiry(client, customTableName, customKeyAttribute, sessionId)
    assert.isAbove(expiryPostTouch, expiry)
  }).timeout(3000)
})
