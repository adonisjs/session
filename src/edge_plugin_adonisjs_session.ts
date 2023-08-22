/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { PluginFn } from 'edge.js/types'
import debug from './debug.js'

/**
 * The edge plugin for AdonisJS Session adds tags to read
 * flash messages
 */
export const edgePluginAdonisJSSession: PluginFn<undefined> = (edge) => {
  debug('registering session tags with edge')

  edge.registerTag({
    tagName: 'flashMessage',
    seekable: true,
    block: true,
    compile(parser, buffer, token) {
      const expression = parser.utils.transformAst(
        parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
        token.filename,
        parser
      )

      const key = parser.utils.stringify(expression)

      /**
       * Write an if statement
       */
      buffer.writeStatement(
        `if (state.flashMessages.has(${key})) {`,
        token.filename,
        token.loc.start.line
      )

      /**
       * Define a local variable
       */
      buffer.writeExpression(
        `let message = state.flashMessages.get(${key})`,
        token.filename,
        token.loc.start.line
      )

      /**
       * Create a local variables scope and tell the parser about
       * the existence of the "message" variable
       */
      parser.stack.defineScope()
      parser.stack.defineVariable('message')

      /**
       * Process component children using the parser
       */
      token.children.forEach((child) => {
        parser.processToken(child, buffer)
      })

      /**
       * Clear the scope of the local variables before we
       * close the if statement
       */
      parser.stack.clearScope()

      /**
       * Close if statement
       */
      buffer.writeStatement(`}`, token.filename, token.loc.start.line)
    },
  })

  edge.registerTag({
    tagName: 'error',
    seekable: true,
    block: true,
    compile(parser, buffer, token) {
      const expression = parser.utils.transformAst(
        parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
        token.filename,
        parser
      )

      const key = parser.utils.stringify(expression)

      /**
       * Write an if statement
       */
      buffer.writeStatement(
        `if (!!state.flashMessages.get('errors')[${key}]) {`,
        token.filename,
        token.loc.start.line
      )

      /**
       * Define a local variable
       */
      buffer.writeExpression(
        `let messages = state.flashMessages.get('errors')[${key}]`,
        token.filename,
        token.loc.start.line
      )

      /**
       * Create a local variables scope and tell the parser about
       * the existence of the "messages" variable
       */
      parser.stack.defineScope()
      parser.stack.defineVariable('messages')

      /**
       * Process component children using the parser
       */
      token.children.forEach((child) => {
        parser.processToken(child, buffer)
      })

      /**
       * Clear the scope of the local variables before we
       * close the if statement
       */
      parser.stack.clearScope()

      /**
       * Close if statement
       */
      buffer.writeStatement(`}`, token.filename, token.loc.start.line)
    },
  })
}
