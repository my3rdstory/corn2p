import dayjs from 'dayjs'
import createLogger, { simpleFormat } from 'if-logger'
import { notiLog } from './common'

export default async function krwusdKb(): Promise<string> {
  const url = 'https://obank.kbstar.com/quics'

  const msg = `[get] ` + url
  const logger = createLogger({
    format: simpleFormat,
    tags: [() => dayjs().format('YYYY-MM-DD HH:mm:ss')],
  })

  try {
    logger.log.time(msg)
    const res = await fetch(url + `?page=C101423`)

    if (!res.ok) {
      notiLog(
        `[kb] failed - [${res.status}] res.ok is falsy ${await res.text()}`,
        {
          level: 'error',
        },
      )
      throw Error(`[kb] failed - [${res.status}] res.ok is falsy`)
    }

    const html = await res.text()

    const idx = html.indexOf('미국(달러)')

    const html2 = html.slice(idx, idx + 200)

    const result = html2.match(new RegExp(`<td class="tRight">(.+)</td>`))

    if (!result) {
      notiLog(`[kb] failed - match result is null\n${html2}`, {
        level: 'error',
      })
      throw Error(`[kb] failed - match result is null\n${html2}`)
    }

    logger.info(`KB: ${result[1]}`)
    return result[1]
  } finally {
    logger.log.timeEnd(msg)
  }
}
