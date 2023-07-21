import { InvalidArgumentsException } from '@poppinss/utils'
import { SessionConfig } from './types.js'

/**
 * Helper to define session config
 */
export function defineConfig(config: SessionConfig) {
  if (!config.cookieName) {
    throw new InvalidArgumentsException('Missing "cookieName" property inside the session config')
  }

  if (!config.driver) {
    throw new InvalidArgumentsException('Missing "driver" property inside the session config')
  }

  return config
}
