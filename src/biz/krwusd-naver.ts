import dayjs from 'dayjs'
import createLogger, { simpleFormat } from 'if-logger'
import { notiLog } from './common'

export default async function krwusdNaver(): Promise<string> {
  const url = 'https://search.naver.com/search.naver'
  const msg = `[get] ` + url
  const logger = createLogger({
    format: simpleFormat,
    tags: [() => dayjs().format('YYYY-MM-DD HH:mm:ss')],
  })

  try {
    logger.log.time(msg)
    const res = await fetch(
      url + `?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=%ED%99%98%EC%9C%A8`,
      { method: 'get' },
    )

    if (!res.ok) {
      notiLog(
        `[naver] - failed [${res.status}] res.ok is falsy ${await res.text()}`,
        {
          level: 'error',
        },
      )
      throw Error(`[naver] failed - [${res.status}] res.ok is falsy`)
    }

    const html = await res.text() // 결과 텍스트 길이 무지 큼 1.2MB
    const result = html.match(
      new RegExp(
        `<em>USD </em>[\r\n\t ]+</dt>[\r\n\t ]+<dd>[\r\n\t ]+<span class=\"spt_con [a-z]{2}\">[\r\n\t ]+<strong>([0-9,.]+)</strong>`,
      ),
    )

    if (!result) {
      throw Error(`[naver] [${res.status}] match result is null`)
    }

    logger.info(`Naver: ${result[1]}`)
    return result[1]
  } finally {
    logger.log.timeEnd(msg)
  }
}
