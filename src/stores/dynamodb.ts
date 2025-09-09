/**
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@adonisjs/core/helpers/string'
import { MessageBuilder } from '@adonisjs/core/helpers'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import {
  type DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'

import debug from '../debug.ts'
import type { SessionStoreContract, SessionData } from '../types.ts'

/**
 * DynamoDB store to read/write session data to AWS DynamoDB.
 * Provides highly scalable, managed session storage with automatic expiry.
 *
 * @example
 * const dynamoStore = new DynamoDBStore(dynamoClient, '2 hours', {
 *   tableName: 'Sessions',
 *   keyAttribute: 'sessionId'
 * })
 */
export class DynamoDBStore implements SessionStoreContract {
  /**
   * DynamoDB client instance
   */
  #client: DynamoDBClient

  /**
   * DynamoDB table name
   */
  #tableName: string

  /**
   * Attribute name for the session key
   */
  #keyAttribute: string

  /**
   * Time-to-live in seconds for session expiry
   */
  #ttlSeconds: number

  /**
   * Attribute name for the session value
   */
  #valueAttribute: string = 'value'

  /**
   * Attribute name for the expiry timestamp
   */
  #expiresAtAttribute: string = 'expires_at'

  /**
   * Creates a new DynamoDB store instance
   *
   * @param client - DynamoDB client instance
   * @param age - Session age in seconds or time expression (e.g. '2 hours')
   * @param options - Configuration options
   * @param options.tableName - DynamoDB table name (defaults to "Session")
   * @param options.keyAttribute - Key attribute name (defaults to "key")
   */
  constructor(
    client: DynamoDBClient,
    age: string | number,
    options?: {
      /**
       * Defaults to "Session"
       */
      tableName?: string

      /**
       * Defaults to "key"
       */
      keyAttribute?: string
    }
  ) {
    this.#client = client
    this.#tableName = options?.tableName ?? 'Session'
    this.#keyAttribute = options?.keyAttribute ?? 'key'
    this.#ttlSeconds = string.seconds.parse(age)
    debug('initiating dynamodb store')
  }

  /**
   * Reads session data from DynamoDB
   *
   * @param sessionId - Session identifier
   *
   * @example
   * const data = await store.read('sess_abc123')
   */
  async read(sessionId: string): Promise<SessionData | null> {
    debug('dynamodb store: reading session data %s', sessionId)

    const command = new GetItemCommand({
      TableName: this.#tableName,
      Key: marshall({ [this.#keyAttribute]: sessionId }),
    })

    const response = await this.#client.send(command)
    if (!response.Item) {
      return null
    }

    if (!response.Item[this.#valueAttribute]) {
      return null
    }

    const item = unmarshall(response.Item)
    const contents = item[this.#valueAttribute] as string
    const expiresAt = item[this.#expiresAtAttribute] as number

    /**
     * Check if the item has been expired and return null (if expired)
     */
    if (Date.now() > expiresAt) {
      return null
    }

    /**
     * Verify contents with the session id and return them as an object. The verify
     * method can fail when the contents is not JSON.
     */
    try {
      return new MessageBuilder().verify<SessionData>(contents, sessionId)
    } catch {
      return null
    }
  }

  /**
   * Writes session values to DynamoDB with expiry
   *
   * @param sessionId - Session identifier
   * @param values - Session data to store
   *
   * @example
   * await store.write('sess_abc123', { userId: 123 })
   */
  async write(sessionId: string, values: Object): Promise<void> {
    debug('dynamodb store: writing session data %s, %O', sessionId, values)

    const message = new MessageBuilder().build(values, undefined, sessionId)
    const command = new PutItemCommand({
      TableName: this.#tableName,
      Item: marshall({
        [this.#keyAttribute]: sessionId,
        [this.#valueAttribute]: message,
        [this.#expiresAtAttribute]: Date.now() + this.#ttlSeconds * 1000,
      }),
    })

    await this.#client.send(command)
  }

  /**
   * Removes session data from DynamoDB
   *
   * @param sessionId - Session identifier to remove
   *
   * @example
   * await store.destroy('sess_abc123')
   */
  async destroy(sessionId: string): Promise<void> {
    debug('dynamodb store: destroying session data %s', sessionId)

    const command = new DeleteItemCommand({
      TableName: this.#tableName,
      Key: marshall({ [this.#keyAttribute]: sessionId }),
    })

    await this.#client.send(command)
  }

  /**
   * Updates the session expiry time in DynamoDB
   *
   * @param sessionId - Session identifier
   *
   * @example
   * await store.touch('sess_abc123')
   */
  async touch(sessionId: string): Promise<void> {
    debug('dynamodb store: touching session data %s', sessionId)

    const command = new UpdateItemCommand({
      TableName: this.#tableName,
      Key: marshall({ [this.#keyAttribute]: sessionId }),
      UpdateExpression: 'SET #expires_at = :expires_at',
      ExpressionAttributeNames: {
        '#expires_at': this.#expiresAtAttribute,
      },
      ExpressionAttributeValues: marshall({
        ':expires_at': Date.now() + this.#ttlSeconds * 1000,
      }),
    })

    await this.#client.send(command)
  }
}
