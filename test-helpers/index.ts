/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { IncomingMessage, ServerResponse } from 'http'
import { FakeLogger } from '@adonisjs/logger/build/standalone'
import { Profiler } from '@adonisjs/profiler/build/standalone'
import { ServerConfig } from '@ioc:Adonis/Core/Server'
import { Encryption } from '@adonisjs/encryption/build/standalone'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { HttpContext } from '@adonisjs/http-server/build/standalone'

export const SECRET = Math.random().toFixed(36).substring(2, 38)
export const encryption = new Encryption({ secret: SECRET })
export const logger = new FakeLogger({ enabled: true, level: 'trace', name: 'adonis' })
export const profiler = new Profiler(__dirname, logger, {})

export function createCtx (
  req: IncomingMessage,
  res: ServerResponse,
  config: Partial<ServerConfig>,
): HttpContextContract {
  const serverConfig: ServerConfig = Object.assign({
    subdomainOffset: 2,
    generateRequestId: false,
    allowMethodSpoofing: false,
    trustProxy: () => true,
    etag: false,
    jsonpCallbackName: 'callback',
    cookie: {},
  }, config)

  return HttpContext.create(
    '/',
    {},
    logger,
    profiler.create('http:request'),
    encryption,
    req,
    res,
    serverConfig,
  ) as unknown as HttpContextContract
}

export function sleep (time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time))
}
