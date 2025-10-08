import { getListMessage } from '../../biz'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { sendMsg } from '../../biz/get-tele-bot'

export default function list(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    const message = await getListMessage()

    sendMsg(chatId, message, {
      parse_mode: 'HTML',
    })
  }
}
