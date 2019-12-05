/*
* @adonisjs/session
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { IncomingMessage, ServerResponse } from 'http'
import { Logger } from '@adonisjs/logger/build/standalone'
import { Profiler } from '@adonisjs/profiler/build/standalone'
import { Encryption } from '@adonisjs/encryption/build/standalone'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { HttpContext } from '@adonisjs/http-server/build/standalone'

export const SECRET = Math.random().toFixed(36).substring(2, 38)

export function createCtx (req: IncomingMessage, res: ServerResponse): HttpContextContract {
  const logger = new Logger({ enabled: true, level: 'trace', name: 'adonis' })
  const profiler = new Profiler({}).create('')
  const encryption = new Encryption(SECRET)

  return HttpContext.create(
    '/',
    {},
    logger,
    profiler,
    encryption,
    req,
    res,
  ) as unknown as HttpContextContract
}

export function sleep (time): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time))
}
