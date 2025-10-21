import { serializeTrade } from '../../biz'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findTrade, findTradeByAuthMemo } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'

export default function tradeInfo(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }
    const tradeId = match[1]

    const trade = findTrade(tradeId) ?? findTradeByAuthMemo(tradeId)

    if (!trade) {
      sendMsg(chatId, '해당하는 거래가 없습니다.')
      return
    }

    sendMsg(chatId, serializeTrade(trade))
  }
}
