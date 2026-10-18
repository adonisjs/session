/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import type { FileSystem } from '@japa/file-system'
import { IgnitorFactory } from '@adonisjs/core/factories'
import Configure from '@adonisjs/core/commands/configure'

const BASE_URL = new URL('./tmp/', import.meta.url)

/**
 * Creates the configure command for the package inside a
 * minimal application scaffolded on the filesystem
 */
async function createConfigureCommand(fs: FileSystem, flags: string[] = []) {
  const ignitor = new IgnitorFactory()
    .withCoreProviders()
    .withCoreConfig()
    .create(BASE_URL, {
      importer: (filePath) => {
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
          return import(new URL(filePath, BASE_URL).href)
        }

        return import(filePath)
      },
    })

  await fs.create('.env', '')
  await fs.createJson('tsconfig.json', {})
  await fs.create('start/env.ts', `export default Env.create(new URL('./'), {})`)
  await fs.create('start/kernel.ts', `router.use([])`)
  await fs.create('adonisrc.ts', `export default defineConfig({}) {}`)

  const app = ignitor.createApp('web')
  await app.init()
  await app.boot()

  const ace = await app.container.make('ace')
  return ace.create(Configure, ['../../index.js', ...flags])
}

test.group('Configure', (group) => {
  group.each.setup(({ context }) => {
    context.fs.baseUrl = BASE_URL
    context.fs.basePath = fileURLToPath(BASE_URL)
  })

  test('prompt for the store, create config file and register provider', async ({ fs, assert }) => {
    const command = await createConfigureCommand(fs)
    command.prompt.trap('Select the store you want to use for sessions').chooseOption(0)
    await command.exec()

    await assert.fileExists('config/session.ts')
    await assert.fileContains('adonisrc.ts', '@adonisjs/session/session_provider')
    await assert.fileContains('config/session.ts', 'defineConfig')
    await assert.fileContains('config/session.ts', 'cookie: stores.cookie()')
    await assert.fileContains('.env', 'SESSION_DRIVER=cookie')
    await assert.fileContains(
      'start/env.ts',
      `SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const)`
    )
  }).timeout(60 * 1000)

  test('configure the store selected with the --store flag', async ({ fs, assert }) => {
    const command = await createConfigureCommand(fs, ['--store=redis'])
    await command.exec()

    await assert.fileContains('config/session.ts', `redis: stores.redis({`)
    await assert.fileNotContains('config/session.ts', 'stores.cookie()')
    await assert.fileContains('.env', 'SESSION_DRIVER=redis')
    await assert.fileContains(
      'start/env.ts',
      `SESSION_DRIVER: Env.schema.enum(['redis', 'memory'] as const)`
    )
  }).timeout(60 * 1000)

  test('create the sessions table migration for the database store', async ({ fs, assert }) => {
    const command = await createConfigureCommand(fs, ['--store=database'])
    await command.exec()

    await assert.fileContains('config/session.ts', 'database: stores.database()')
    const migrations = await fs.readDir('database/migrations')
    assert.lengthOf(migrations, 1)
    assert.match(migrations[0].basename, /_create_sessions_table\.ts$/)
  }).timeout(60 * 1000)

  test('report error when the store is invalid', async ({ fs, assert }) => {
    const command = await createConfigureCommand(fs, ['--store=dynamodb'])
    await command.exec()

    assert.equal(command.exitCode, 1)
    await assert.fileNotExists('config/session.ts')
  }).timeout(60 * 1000)
})
