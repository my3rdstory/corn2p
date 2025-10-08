import { getPriceListMessage } from '../../biz'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { sendMsg } from '../../biz/get-tele-bot'

export default function priceList(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    const message = await getPriceListMessage()

    sendMsg(chatId, message, {
      parse_mode: 'HTML',
    })
  }
}
