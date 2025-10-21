import { notPaidTradeTldr, splitAndSend } from '../../biz'
import { CHAT_ID } from '../../biz/config'
import { getTrades } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { Trade } from '../../types'

export default function adminTradesNotPaid(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }

    const list: Trade[] = getTrades().filter(
      item => !item.satsSended || !item.txFeePaid,
    )

    if (list.length === 0) {
      sendMsg(chatId, 'No result')
      return
    }

    await splitAndSend<Trade>({
      count: 20,
      chatId,
      list,
      serialize: notPaidTradeTldr,
      itemDelimeter: '\n\n\n',
    })
  }
}
