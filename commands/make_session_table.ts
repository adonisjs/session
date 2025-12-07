/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { stubsRoot } from '../stubs/main.js'
import { BaseCommand } from '@adonisjs/core/ace'

/**
 * Command to create the sessions table migration
 */
export default class MakeSessionTable extends BaseCommand {
  static commandName = 'make:session-table'
  static description = 'Create a migration for the sessions database table'

  async run() {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/migration/sessions.stub', {
      migration: { tableName: 'sessions', prefix: Date.now() },
    })
  }
}
