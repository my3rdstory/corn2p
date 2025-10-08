import dayjs from 'dayjs'
import createLogger, { simpleFormat } from 'if-logger'
import { queryObjToStr } from 'mingutils'

const p2pFetch = async (url, option) => {
  const msg = `[${option.method}] ${url}`
  const logger = createLogger({
    format: simpleFormat,
    tags: [() => dayjs().format('YYYY-MM-DD HH:mm:ss')],
  })

  try {
    logger.log.time(msg)

    const retryCount = option.retryCount ?? 1
    const res = await fetch(url, option)

    if (res.ok) {
      return res.json()
    }

    const text = await res.text()

    if (res.status === 429 && retryCount > 0) {
      logger.warn(
        `retry fetch after 5s. retryCount(${retryCount}).\n${url}\n${JSON.stringify(
          option,
        )} - ${`[${res.status}] ${text}`}}`,
      )
      // 5초 기다렸다가 한번 더 api 호출
      await new Promise(resolve => setTimeout(() => resolve(undefined), 5000))
      return p2pFetch(url, { ...option, retryCount: retryCount - 1 })
    }

    throw Error(`[${res.status}] ${text}`)
  } finally {
    logger.log.timeEnd(msg)
  }
}

export const req = {
  get: (url, searchParams?: any, option = {}) =>
    p2pFetch(url + (searchParams ? '?' + queryObjToStr(searchParams) : ''), {
      method: 'get',
      ...option,
    }),
  post: (url, payload, option = {}) =>
    p2pFetch(url, {
      method: 'post',
      ...(payload && { body: JSON.stringify(payload) }),
      ...option,
    }),
  patch: (url, payload, option) =>
    p2pFetch(url, {
      method: 'PATCH', // WTF! `patch` is not allowed!
      ...(payload && { body: JSON.stringify(payload) }),
      ...option,
    }),
  put: (url, payload = {}, option = {}) =>
    p2pFetch(url, { method: 'put', body: JSON.stringify(payload), ...option }),
  delete: (url, payload = {}, option = {}) =>
    p2pFetch(url, {
      method: 'delete',
      body: JSON.stringify(payload),
      ...option,
    }),
}
