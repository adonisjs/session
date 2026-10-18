/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import type Configure from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.ts'

/**
 * Stores that can be configured with "node ace configure". The
 * DynamoDB store is left out since it needs AWS credentials and
 * a table that we cannot create for the user.
 */
const STORES: Record<string, { name: string; requires?: string }> = {
  cookie: { name: 'Cookie' },
  file: { name: 'File' },
  redis: { name: 'Redis', requires: '@adonisjs/redis' },
  database: { name: 'Database', requires: '@adonisjs/lucid' },
}

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  /**
   * Prompt to select the store when --store flag is not used
   */
  const store: string =
    command.parsedFlags.store ??
    (await command.prompt.choice(
      'Select the store you want to use for sessions',
      Object.entries(STORES).map(([name, { name: message }]) => ({ name, message }))
    ))

  if (!Object.hasOwn(STORES, store)) {
    command.logger.error(
      `The selected store "${store}" is invalid. Select one from: ${string.sentence(Object.keys(STORES))}`
    )
    command.exitCode = 1
    return
  }

  const codemods = await command.createCodemods()

  /**
   * Publish config file
   */
  await codemods.makeUsingStub(stubsRoot, 'config/session.stub', { store })

  /**
   * Publish the sessions table migration for the database store
   */
  if (store === 'database') {
    await codemods.makeUsingStub(stubsRoot, 'make/migration/sessions.stub', {
      migration: { tableName: 'sessions', prefix: Date.now() },
    })
  }

  /**
   * Define environment variables
   */
  await codemods.defineEnvVariables({ SESSION_DRIVER: store })

  /**
   * Define environment variables validations. The memory store is
   * always available and commonly used in the testing environment.
   */
  await codemods.defineEnvValidations({
    variables: {
      SESSION_DRIVER: `Env.schema.enum(['${store}', 'memory'] as const)`,
    },
    leadingComment: 'Variables for configuring session package',
  })

  /**
   * Register middleware
   */
  await codemods.registerMiddleware('router', [
    {
      path: '@adonisjs/session/session_middleware',
    },
  ])

  /**
   * Register provider and commands
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/session/session_provider')
    rcFile.addCommand('@adonisjs/session/commands')
  })

  const { requires } = STORES[store]
  if (requires) {
    command.logger.info(`The ${store} store requires "${requires}" to be configured`)
  }
}
