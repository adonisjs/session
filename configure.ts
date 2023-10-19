/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  /**
   * Publish config file
   */
  await command.publishStub('config.stub')

  const codemods = await command.createCodemods()

  /**
   * Define environment variables
   */
  await codemods.defineEnvVariables({ SESSION_DRIVER: 'cookie' })

  /**
   * Define environment variables validations
   */
  await codemods.defineEnvValidations({
    variables: {
      SESSION_DRIVER: `Env.schema.enum(['cookie', 'memory'] as const)`,
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
   * Register provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/session/session_provider')
  })
}
