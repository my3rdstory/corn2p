import * as R from 'ramda'
import dayjsKo from './dayjs-ko'
import logger from './logger'

export { req } from './req'
export const add = R.add
export const inc = R.inc
export const always = R.always
export const dissocPath = R.dissocPath
export const pick = R.pick
export const adjust = R.adjust
export const path = R.path
export const keys = R.keys
export const pathEq = R.pathEq
export const equals = R.equals
export const pipe = R.pipe
export const update = R.update
export const omit = R.omit
export const toPairs = R.toPairs
export const head = R.head
export const init = R.init
export const ifElse = R.ifElse
export const isNil = R.isNil
export const startsWith = R.startsWith
export const type = R.type
export const identity = R.identity
export const isEmpty = R.isEmpty
export const last = R.last
export const concat = R.concat
export const clone = R.clone
export const lt = R.lt
export const gt = R.gt
export const cond = R.cond
export const all = R.all
export const any = R.any
export const assoc = R.assoc
export const sort = R.sort
export const filter = R.filter
export const reject = R.reject
export const evolve = R.evolve
export const assocPath = R.assocPath
export const slice = R.slice
export const forEach = R.forEach
export const has = R.has
export const not = R.not
export const split = R.split
export const T = R.T
export const F = R.F
export const complement = R.complement
export const find = R.find
export const map = R.map
export const mapObjIndexed = R.mapObjIndexed
export const append = R.append
export const remove = R.remove
export const insert = R.insert
export const range = R.range
export const prop = R.prop
export const props = R.props
export const unless = R.unless
export const dropLast = R.dropLast
export const endsWith = R.endsWith
export const join = R.join
export const gte = R.gte
export const lte = R.lte
export const values = R.values
export const when = R.when
export const tail = R.tail
export const groupBy = R.groupBy
export const reverse = R.reverse
export const length = R.length
export const __ = R.__
export const flatten = R.flatten
export const includes = R.includes
export const uniq = R.uniq
export const uniqBy = R.uniqBy
export const reduce = R.reduce
export const max = R.max
export const propOr = R.propOr
export const sum = R.sum
export const mergeAll = R.mergeAll
export const curry = R.curry
export const sortBy = R.sortBy
export const compose = R.compose
export const trim = R.trim
export const nth = R.nth
export const replace = R.replace
export const multiply = R.multiply
export const differenceWith = R.differenceWith
export const difference = R.difference
export const intersection = R.intersection
export const union = R.union

export const isNotEmpty = complement(isEmpty)

export const isNotNil = complement(isNil)

export const delay = (ms: number) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve(undefined)
    }, ms)
  })

export const sortText = (a: string, b: string): number => a.localeCompare(b)
export const sortNumber = (a: number, b: number): number => a - b
export const sortBoolean = (a: boolean, b: boolean): number => {
  if (a && !b) {
    return -1
  } else if (!a && b) {
    return 1
  } else {
    return 0
  }
}

export const sortTextProp = prop => (a, b) => sortText(a[prop], b[prop])
export const sortNumberProp = prop => (a, b) => sortNumber(a[prop], b[prop])
export const sortBooleanProp = prop => (a, b) => sortBoolean(a[prop], b[prop])

export const isString = pipe(type, equals('String'))
export const isNumber = pipe(type, equals('Number'))
export const isBoolean = pipe(type, equals('Boolean'))
export const isDate = (value: any): boolean => value instanceof Date

export const sortProp = prop => (a, b) => {
  if (isDate(a[prop]) && isDate(b[prop])) {
    return sortNumber(a[prop].getTime(), b[prop].getTime())
  }
  if (isString(a[prop]) && isString(b[prop])) {
    return sortTextProp(prop)(a, b)
  }
  if (isNumber(a[prop]) && isNumber(b[prop])) {
    return sortNumberProp(prop)(a, b)
  }
  if (isBoolean(a[prop]) && isBoolean(b[prop])) {
    return sortBooleanProp(prop)(a, b)
  }
  if (isNil(a[prop]) && isNotNil(b[prop])) {
    return -1
  } else if (isNotNil(a[prop]) && isNil(b[prop])) {
    return 1
  } else if (a[prop] === b[prop]) {
    return 0
  } else if (a[prop] === null && b[prop] === undefined) {
    return 1
  } else if (a[prop] === undefined && b[prop] === null) {
    return -1
  }

  throw Error(`Not supported type a=${a}, b=${b}`)
}

export function assert(
  condition: any,
  message?: string,
  option?: any,
): asserts condition {
  if (condition) {
    return
  }
  if (!message && !option) {
    throw new Error(`AssertionError`)
  }
  if (!option) {
    throw new Error(`AssertionError: ${message}`)
  }

  if (option) {
    throw new AssertionError({ message, ...option })
  }
}

class AssertionError extends Error {
  constructor(args, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AssertionError)
    }
    Object.assign(this, args)
  }
}

const partial2nd = fn => (first, second, third) => {
  if (third === undefined) {
    return value => fn(first, value, second)
  }
  return fn(first, second, third)
}

export const gtelte = partial2nd(
  (min, value, max) => gte(value, min) && lte(value, max),
)
export const gtlte = partial2nd(
  (min, value, max) => gt(value, min) && lte(value, max),
)
export const gtelt = partial2nd(
  (min, value, max) => gte(value, min) && lt(value, max),
)
export const gtlt = partial2nd(
  (min, value, max) => gt(value, min) && lt(value, max),
)
export const propEq = curry((a, b, c) => c[b] === a)
export const propNotEq = complement(propEq)

export const dateFormat = (date?: string | number, format?: string) =>
  dayjsKo(date).format(format ?? 'M/D HH:mm:ss')

export const COUNT = {
  sendMessage: 0,
}
export function sequentialInvoke<T>(fn, delayTime = 0) {
  let promise = Promise.resolve()
  let count = 0

  return (...args): Promise<T> => {
    count++
    COUNT[fn.name] = count
    logger
      .if(fn.name === 'sendMessage' && args[0])
      .verbose(`${fn.name} (${'i'.repeat(count)})`)
    return new Promise((resolve, reject) => {
      promise = promise.finally(async () => {
        try {
          const result = await fn(...args)
          if (delayTime > 0) {
            await delay(delayTime)
          }
          resolve(result)
        } catch (err: any) {
          logger.error('[sequentialInvoke]', err.message)
          reject(err.message)
        } finally {
          count--
          COUNT[fn.name] = count
          logger
            .if(fn.name === 'sendMessage' && args[0])
            .verbose(`${fn.name} (${'i'.repeat(count)})`)
        }
      })
    })
  }
}

export function sequentialInvokeByParam<T>(fn) {
  let promiseMap: Record<string, Promise<undefined>> = {}
  let count = 0

  return (param: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const key = param.slice(-8)
      promiseMap[key] = (promiseMap[key] ?? Promise.resolve()).finally(
        async () => {
          try {
            const result = await fn(param)
            resolve(result)
          } catch (err: any) {
            logger.error('[sequentialInvokeByParam]', err.message)
            reject(err.message)
          }
        },
      )
    })
  }
}

export function fnWithCache<T>(fn, ms: number) {
  const cache: { result: any; updatedAt: number; hit: number } = {
    result: undefined,
    updatedAt: 0,
    hit: 0,
  }

  const fnName = fn.name || 'anonymousFn'

  const tmp = {
    [fnName]: async (...args): Promise<T> => {
      try {
        if (cache.updatedAt && Date.now() - cache.updatedAt < ms) {
          cache.hit++
          logger.verbose(
            `[${fn.name}] return cache value [${
              typeof cache.result === 'number'
                ? cache.result.toLocaleString()
                : cache.result
            }] (${cache.hit}) in ${ms}ms `,
          )
          return cache.result
        }
        cache.result = await fn(...args)
        cache.updatedAt = Date.now()
        // logger.verbose(`[${fn.name}] return fresh value [${cache.result}]`)
        return cache.result
      } catch (e: any) {
        throw Error(`[${fn.name}] ` + e.message)
      }
    },
  }

  return tmp[fnName]
}

export function fnWithCacheByParam<T>(fn, ms: number) {
  const cache: Record<string, { result: any; updatedAt: number; hit: number }> =
    {}
  const fnName = fn.name || 'anonymousFn'

  const tmp = {
    [fnName]: async (param: string): Promise<T> => {
      const key = param.slice(-8)
      if (cache[key]?.updatedAt && Date.now() - cache[key].updatedAt < ms) {
        cache[key].hit++
        logger.verbose(
          `[${fn.name}-${key.slice(-4)}] return cache value [${cache[
            key
          ].result.satsBalance.toLocaleString()}] (${
            cache[key].hit
          }) in ${ms}ms `,
        )
        return cache[key].result
      }
      cache[key] = {
        result: await fn(param),
        updatedAt: Date.now(),
        hit: cache[key]?.hit ?? 0,
      }
      // logger.verbose(`[${fn.name}] return fresh value [${cache.result}]`)
      return cache[key].result
    },
  }

  return tmp[fnName]
}
