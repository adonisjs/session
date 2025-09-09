/*
 * @adonisjs/redis
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import lodash from '@poppinss/utils/lodash'
import { RuntimeException } from '@adonisjs/core/exceptions'
import type { AllowedSessionValues, SessionData } from './types.ts'

/**
 * Readonly session store that provides read-only access to session values.
 * Used for sharing session data with templates and other readonly contexts.
 *
 * @example
 * const readOnlyStore = new ReadOnlyValuesStore({ user: 'john', theme: 'dark' })
 * const user = readOnlyStore.get('user')
 * const hasTheme = readOnlyStore.has('theme')
 */
export class ReadOnlyValuesStore {
  /**
   * Underlying store values containing session data
   */
  protected values: SessionData

  /**
   * Returns true if the store is empty
   */
  get isEmpty() {
    return !this.values || Object.keys(this.values).length === 0
  }

  /**
   * Creates a new readonly values store
   *
   * @param values - Initial session data or null
   */
  constructor(values: SessionData | null) {
    this.values = values || {}
  }

  /**
   * Gets value for a given key
   *
   * @param key - The key or key path to retrieve
   * @param defaultValue - Default value if key doesn't exist
   *
   * @example
   * store.get('username', 'guest')
   * store.get(['user', 'preferences', 'theme'], 'light')
   */
  get(key: string | string[], defaultValue?: any): any {
    const value = lodash.get(this.values, key)
    if (defaultValue !== undefined && (value === null || value === undefined)) {
      return defaultValue
    }

    return value
  }

  /**
   * Checks if a value exists. Includes extra guards to check arrays for length.
   *
   * @param key - The key or key path to check
   * @param checkForArraysLength - Whether to check array length (default: true)
   *
   * @example
   * store.has('username')                    // Check if key exists
   * store.has(['user', 'roles'])            // Check nested key
   * store.has('items', false)               // Don't check array length
   */
  has(key: string | string[], checkForArraysLength: boolean = true): boolean {
    const value = this.get(key)
    if (!Array.isArray(value)) {
      return !!value
    }

    return checkForArraysLength ? value.length > 0 : !!value
  }

  /**
   * Gets all values from the store
   *
   * @example
   * const allData = store.all()
   */
  all(): any {
    return this.values
  }

  /**
   * Returns object representation of values
   *
   * @example
   * const obj = store.toObject()
   */
  toObject() {
    return this.all()
  }

  /**
   * Returns the store values as JSON-serializable data
   *
   * @example
   * const json = store.toJSON()
   */
  toJSON(): any {
    return this.all()
  }

  /**
   * Returns string representation of the store
   *
   * @example
   * const str = store.toString()
   */
  toString() {
    return JSON.stringify(this.all())
  }
}

/**
 * Session store encapsulates the session data and offers a
 * declarative API to mutate it.
 *
 * @example
 * const store = new ValuesStore({ counter: 0 })
 * store.set('username', 'john')
 * store.increment('counter')
 * const hasData = store.hasBeenModified
 */
export class ValuesStore extends ReadOnlyValuesStore {
  /**
   * Flag to track if the store has been modified
   */
  #modified: boolean = false

  /**
   * Creates a new values store
   *
   * @param values - Initial session data or null
   */
  constructor(values: SessionData | null) {
    super(values)
  }

  /**
   * Returns true if the store has been modified
   */
  get hasBeenModified(): boolean {
    return this.#modified
  }

  /**
   * Sets a key/value pair in the store
   *
   * @param key - The key or key path to set
   * @param value - The value to set
   *
   * @example
   * store.set('username', 'john')
   * store.set(['user', 'preferences'], { theme: 'dark' })
   */
  set(key: string | string[], value: AllowedSessionValues): void {
    this.#modified = true
    lodash.set(this.values, key, value)
  }

  /**
   * Removes a key from the store
   *
   * @param key - The key or key path to remove
   *
   * @example
   * store.unset('temp_data')
   * store.unset(['user', 'cache'])
   */
  unset(key: string | string[]): void {
    this.#modified = true
    lodash.unset(this.values, key)
  }

  /**
   * Pulls value from the store. Same as calling store.get then store.unset.
   *
   * @param key - The key or key path to pull
   * @param defaultValue - Default value if key doesn't exist
   *
   * @example
   * const message = store.pull('notification', 'No messages')
   * const data = store.pull(['temp', 'data'])
   */
  pull(key: string | string[], defaultValue?: any): any {
    return ((value): any => {
      this.unset(key)
      return value
    })(this.get(key, defaultValue))
  }

  /**
   * Increments a numeric value. Raises an error when underlying value is not a number.
   *
   * @param key - The key or key path to increment
   * @param steps - Number of steps to increment (default: 1)
   *
   * @example
   * store.increment('page_views')     // Increments by 1
   * store.increment('score', 10)      // Increments by 10
   */
  increment(key: string | string[], steps: number = 1): void {
    const value = this.get(key, 0)
    if (typeof value !== 'number') {
      throw new RuntimeException(`Cannot increment "${key}". Existing value is not a number`)
    }

    this.set(key, value + steps)
  }

  /**
   * Decrements a numeric value. Raises an error when underlying value is not a number.
   *
   * @param key - The key or key path to decrement
   * @param steps - Number of steps to decrement (default: 1)
   *
   * @example
   * store.decrement('attempts')       // Decrements by 1
   * store.decrement('credits', 5)     // Decrements by 5
   */
  decrement(key: string | string[], steps: number = 1): void {
    const value = this.get(key, 0)
    if (typeof value !== 'number') {
      throw new RuntimeException(`Cannot decrement "${key}". Existing value is not a number`)
    }

    this.set(key, value - steps)
  }

  /**
   * Overwrites existing store data with new values
   *
   * @param values - New values to replace existing data
   *
   * @example
   * store.update({ username: 'jane', theme: 'light' })
   */
  update(values: { [key: string]: any }): void {
    this.#modified = true
    this.values = values
  }

  /**
   * Merges values with existing store data
   *
   * @param values - Values to merge with existing data
   *
   * @example
   * store.merge({ newField: 'value', existingField: 'updated' })
   */
  merge(values: { [key: string]: any }): any {
    this.#modified = true
    lodash.merge(this.values, values)
  }

  /**
   * Resets store by clearing all values
   *
   * @example
   * store.clear() // Removes all data from store
   */
  clear(): void {
    this.update({})
  }
}
