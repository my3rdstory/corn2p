import { getListMessage } from '../../biz'
import { sendMsg } from '../../biz/get-tele-bot'

export default function list(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    const message = await getListMessage()

    sendMsg(chatId, message, {
      parse_mode: 'HTML',
    })
  }
}
