/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { getActiveTest } from '@japa/runner'
import type { Test } from '@japa/runner/core'
import { browserClient } from '@japa/browser-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { ApiClient, apiClient } from '@japa/api-client'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { runner, syncReporter } from '@japa/runner/factories'
import type { ApplicationService } from '@adonisjs/core/types'
import { type NamedReporterContract } from '@japa/runner/types'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'

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

  await runner()
    .configure({
      reporters: {
        activated: [syncReporter.name],
        list: [syncReporter as NamedReporterContract],
      },
      plugins: [
        apiClient(),
        browserClient({}),
        pluginAdonisJS(app),
        sessionApiClient(app),
        sessionBrowserClient(app),
      ],
      files: [],
    })
    .runTest('testing japa integration', callback)
}

/**
 * Helper to create a dynamo DB client instance
 */
export const dynamodbClient = {
  create() {
    const client = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
      credentials: {
        accessKeyId: 'accessKeyId',
        secretAccessKey: 'secretAccessKey',
      },
    })
    return client
  },
}

/**
 * Returns the session id value from the dynamoDB store
 */
export async function getSession(
  client: DynamoDBClient,
  tableName: string,
  key: string,
  sessionId: string
) {
  const result = await client.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({ [key]: sessionId }),
    })
  )

  if (!result.Item) {
    return null
  }

  const item = unmarshall(result.Item)
  return JSON.parse(item.value) ?? null
}

/**
 * Returns expiry for the session id from the dynamoDB store
 */
export async function getExpiry(
  client: DynamoDBClient,
  tableName: string,
  key: string,
  sessionId: string
) {
  const result = await client.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({ [key]: sessionId }),
    })
  )

  if (!result.Item) {
    return 0
  }

  const item = unmarshall(result.Item)
  return item.expires_at as number
}
