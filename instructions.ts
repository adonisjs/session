/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import sinkStatic from '@adonisjs/sink'

export default function instructions (
  projectRoot: string,
  _application: ApplicationContract,
  { JsonFile, kleur }: typeof sinkStatic,
) {
  const tsConfig = new JsonFile(projectRoot, 'tsconfig.json')
  const types = tsConfig.get('compilerOptions.types')

  /**
   * Adding `@adonisjs/session` to the types, when it doesn't exists
   * already
   */
  if (!types.find((type: string) => type.includes('@adonisjs/session'))) {
    types.push('@adonisjs/session')
    tsConfig.set('compilerOptions.types', types)
    tsConfig.commit()
    console.log(`  update  ${kleur.green('tsconfig.json')}`)
  }
}
