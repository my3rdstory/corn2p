import { getPriceListMessage } from '../../biz'
import { sendMsg } from '../../biz/get-tele-bot'

export default function priceList(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    const message = await getPriceListMessage()

    sendMsg(chatId, message, {
      parse_mode: 'HTML',
    })
  }
}
