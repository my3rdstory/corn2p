import dayjs from 'dayjs'
import createLogger, { simpleFormat } from 'if-logger'
import dayjsKo from '../utils/dayjs-ko'
import { notiLog } from './common'

export default async function krwusdWoori(): Promise<string> {
  const formData = new FormData()
  formData.append('ajax', 'true')
  formData.append('BAS_DT_601', dayjsKo().format('YYYYMMDD'))
  formData.append('NTC_DIS', 'A')
  formData.append('INQ_DIS_601', '')
  formData.append('SELECT_DATE_601', dayjsKo().format('YYYY.MM.DD'))
  formData.append('SELECT_DATE_601Y', dayjsKo().format('YYYY'))
  formData.append('SELECT_DATE_601M', dayjsKo().format('MM'))
  formData.append('SELECT_DATE_601D', dayjsKo().format('DD'))
  const url = 'https://spib.wooribank.com/pib/jcc'

  const msg = `[post] ` + url
  const logger = createLogger({
    format: simpleFormat,
    tags: [() => dayjs().format('YYYY-MM-DD HH:mm:ss')],
  })

  try {
    logger.log.time(msg)
    const res = await fetch(url + `?withyou=CMCOM0184&__ID=c012238`, {
      method: 'post',
      body: formData,
    })

    if (!res.ok) {
      notiLog(
        `[woori] failed - [${res.status}] res.ok is falsy ${await res.text()}`,
        {
          level: 'error',
        },
      )
      throw Error(`[woori] failed - [${res.status}] res.ok is falsy`)
    }

    const html = await res.text() //.then(slice(1000, 2000))

    if (html.includes('당일의 환율이 고시되지 않았습니다')) {
      // notiLog('[woori] 당일의 환율이 고시되지 않았습니다', {
      //   level: 'error',
      // })
      logger.error('[woori] 당일의 환율이 고시되지 않았습니다')
      throw Error('[woori] 당일의 환율이 고시되지 않았습니다')
    }
    const result = html.match(
      /**
       * 주의!!
       * 노드에서는 \r\n 으로 인식하고, 브라우져에서는 \n 하나만 씀
       * 탭이랑 공백 문자도 사용하는게 서로 다르고;;;
       */
      new RegExp(
        `USD<\/a><\/td>[\r\t\n ]+(?:<td>.+<\/td>[\r\t\n ]+){7}<td>(.+)<\/td>`,
      ),
    )

    if (!result) {
      logger.verbose('[woori] html\n' + html)
      notiLog(`[woori] failed - [${res.status}] match result is null\n`, {
        level: 'error',
      })
      throw Error(`[woori] failed - [${res.status}] match result is null`)
    }

    logger.info(`Woori: ${result[1]}`)
    return result[1]
  } finally {
    logger.log.timeEnd(msg)
  }
}
