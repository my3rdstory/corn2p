import dayjs from 'dayjs'
import createLogger, { simpleFormat } from 'if-logger'
import dayjsKo from '../utils/dayjs-ko'
import { notiLog } from './common'

export default async function krwusdHana(): Promise<string> {
  const formData = new FormData()
  formData.append('ajax', 'true')
  formData.append('tmpInqStrDt', dayjsKo().format('YYYY-MM-DD'))
  formData.append('pbldDvCd', '3')
  formData.append('inqStrDt', dayjsKo().format('YYYYMMDD'))
  formData.append('inqKindCd', '1')
  formData.append('requestTarget', 'searchContentDiv')
  const url = 'https://www.kebhana.com/cms/rate/wpfxd651_01i_01.do'

  const msg = `[post] ` + url
  const logger = createLogger({
    format: simpleFormat,
    tags: [() => dayjs().format('YYYY-MM-DD HH:mm:ss')],
  })

  try {
    logger.log.time(msg)
    const res = await fetch(url, { method: 'post', body: formData })

    if (!res.ok) {
      notiLog(
        `[hana] failed - [${res.status}] res.ok is falsy ${(
          await res.text()
        ).slice(0, 200)}`,
        {
          level: 'error',
        },
      )
      throw Error(`[hana] failed - [${res.status}] res.ok is falsy`)
    }

    const html = await res.text()
    const result = html.match(
      // 24.09.01 하나은행 환율 화면 스냅샷 https://telegra.ph/file/b90980c0196f1d98742af.png
      // 매매기준율을 가져와야 함
      new RegExp(
        `미국 USD[\r\n\t]+<\/u>[\r\n\t]+<\/a>[\r\n\t]+<\/td>(?:[\r\n\t]+<td class=\"txtAr\">.+<\/td>){7}[\r\n\t]+<td class=\"txtAr\">(.+)<\/td>`,
      ),
    )

    if (!result) {
      logger.verbose('[hana] html\n' + html)
      notiLog(`[hana] failed - [${res.status}] match result is null\n`, {
        level: 'error',
      })
      throw Error(`[hana] failed - [${res.status}] match result is null`)
    }

    logger.info(`Hana: ${result[1]}`)
    return result[1]
  } finally {
    logger.log.timeEnd(msg)
  }
}
