/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { IgnitorFactory } from '@adonisjs/core/factories'
import { FileSystem } from '@japa/file-system'
import { SessionConfig } from '../src/types.js'
import { ApplicationService } from '@adonisjs/core/types'
import { RedisService } from '@adonisjs/redis/types'
import { RedisManagerFactory } from '@adonisjs/redis/factories'
import { Application } from '@adonisjs/core/app'
import { IncomingMessage, ServerResponse } from 'http'
import { Server } from '@adonisjs/core/http'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { Runner } from '@japa/runner/core'

/**
 * Session default config
 */
export const sessionConfig: SessionConfig = {
  enabled: true,
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: 3000,
  cookie: {
    path: '/',
  },
}

export const BASE_URL = new URL('./tmp/', import.meta.url)

export async function setup(fs: FileSystem, config?: any) {
  const IMPORTER = (filePath: string) => {
    if (filePath.startsWith('./') || filePath.startsWith('../')) {
      return import(new URL(filePath, BASE_URL).href)
    }
    return import(filePath)
  }

  const ignitor = new IgnitorFactory()
    .withCoreConfig()
    .withCoreProviders()
    .merge({
      rcFileContents: { providers: ['../../providers/session_provider.js'] },
      config: config || { session: sessionConfig },
    })
    .create(fs.baseUrl, { importer: IMPORTER })

  const app = ignitor.createApp('web')

  await app.init()
  await app.boot()

  // @ts-ignore
  await pluginAdonisJS(app)({
    runner: new Runner({} as any),
  })

  return { app, ignitor }
}

/**
 * Sleep for a while
 */
export function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time))
}

/**
 * Signs value to be set as cookie header
 */
export async function signCookie(app: ApplicationService, value: any, name: string) {
  const encryption = await app.container.make('encryption')
  return `${name}=s:${encryption.verifier.sign(value, undefined, name)}`
}

/**
 * Encrypt value to be set as cookie header
 */
export async function encryptCookie(app: ApplicationService, value: any, name: string) {
  const encryption = await app.container.make('encryption')
  return `${name}=e:${encryption.encrypt(value, undefined, name)}`
}

/**
 * Decrypt cookie
 */
export async function decryptCookie(app: ApplicationService, header: any, name: string) {
  const encryption = await app.container.make('encryption')
  const cookieValue = decodeURIComponent(header['set-cookie'][0].split(';')[0])
    .replace(`${name}=`, '')
    .slice(2)

  return encryption.decrypt(cookieValue, name)
}

/**
 * Unsign cookie
 */
export async function unsignCookie(app: ApplicationService, header: any, name: string) {
  const encryption = await app.container.make('encryption')

  const cookieValue = decodeURIComponent(header['set-cookie'][0].split(';')[0])
    .replace(`${name}=`, '')
    .slice(2)

  return encryption.verifier.unsign<any>(cookieValue, name)
}

/**
 * Reference to the redis manager
 */
export function getRedisManager(application: ApplicationService) {
  return new RedisManagerFactory({
    connection: 'session',
    connections: {
      session: {
        host: process.env.REDIS_HOST || '0.0.0.0',
        port: process.env.REDIS_PORT || 6379,
      },
    },
  }).create(application) as RedisService
}

export async function createHttpContext(
  app: Application<any>,
  req: IncomingMessage,
  res: ServerResponse
) {
  const adonisServer = (await app.container.make('server')) as Server

  const request = adonisServer.createRequest(req, res)
  const response = adonisServer.createResponse(req, res)
  const ctx = adonisServer.createHttpContext(request, response, app.container.createResolver())

  return ctx
}
