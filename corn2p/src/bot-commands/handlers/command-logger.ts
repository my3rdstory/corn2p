import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { notiLog, username } from '../../biz/common'
import { sendMsg } from '../../biz/get-tele-bot'
import logger from '../../utils/logger'

dayjs.extend(relativeTime)

export default function commandLogger(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    const message = match[0]

    try {
      if (message.startsWith('/new buyer') || message === '/newbuyer') {
        sendMsg(
          chatId,
          '명령어 사용이 유효하지 않습니다.\n\n아래와 같이 사용해 주세요\nex) /newbuyer youraddress@strike.me',
        )
      } else if (message.startsWith('/edit ') || message === '/edit') {
        sendMsg(
          chatId,
          '명령어 사용이 유효하지 않습니다.\n\n아래와 같이 사용해 주세요\nex) /editp 2.3',
        )
      }

      notiLog(`[${username(msg.from)}] ${message}`, {
        level: 'warn',
      })
    } catch (err: any) {
      logger.error(`[commandLogger][${message}] ${err.message}`)
    }
    return
  }
}
