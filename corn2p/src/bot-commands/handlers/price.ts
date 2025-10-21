import { getPriceMessage } from '../../biz'
import { sendMsg } from '../../biz/get-tele-bot'

export default function price(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    const message = await getPriceMessage()

    sendMsg(chatId, message, {
      parse_mode: 'HTML',
    })
  }
}
