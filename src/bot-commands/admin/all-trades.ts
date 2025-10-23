import { splitAndSend, tradeTldr } from '../../biz'
import { CHAT_ID } from '../../biz/config'
import { getTrades } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { Trade } from '../../types'

export default function allTrades(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }

    const list: Trade[] = getTrades()
    if (list.length === 0) {
      sendMsg(chatId, 'No result')
      return
    }

    await splitAndSend<Trade>({
      count: 20,
      chatId,
      list: list,
      serialize: (item, idx, arr, pageIdx) => tradeTldr(item),
      itemDelimeter: '\n\n',
    })
  }
}
