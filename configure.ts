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

  /**
   * Define environment variables
   */
  await command.defineEnvVariables({ SESSION_DRIVER: 'cookie' })

  /**
   * Define environment variables validations
   */
  await command.defineEnvValidations({
    variables: {
      SESSION_DRIVER: `Env.schema.enum(['cookie', 'redis', 'file', 'memory' as const])`,
    },
    leadingComment: 'Variables for configuring session package',
  })

  /**
   * Register provider
   */
  await command.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/session/session_provider')
  })
}
