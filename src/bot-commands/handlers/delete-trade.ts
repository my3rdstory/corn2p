import { byWhom, notiAdmin } from '../../biz/common'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findTrade, findTradeByAuthMemo, setTrades } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { propEq, reject } from '../../utils/lib'
import logger from '../../utils/logger'

export default function deleteTrade(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }
    const tradeId = match[1]
    logger.verbose(`[deletetrade] ${JSON.stringify({ chatId, tradeId })}`)

    if (!tradeId) {
      sendMsg(
        chatId,
        '거래 아이디나 입금자명을 입력해 주세요\n\nex)\n/deletetrade 2513fd7f\n/deletetrade 인기정문',
      )
      return
    }
    const trade = findTrade(tradeId) ?? findTradeByAuthMemo(tradeId)
    if (!trade) {
      sendMsg(chatId, '해당하는 거래가 없습니다.')
      return
    }

    if (trade.buyerChatId !== chatId) {
      sendMsg(chatId, '거래 삭제는 해당 구매자만 가능합니다.')
      return
    }

    if (trade.krwPaidAt) {
      sendMsg(chatId, '원화 입금이 완료된 거래는 삭제가 불가합니다.')
      return
    }

    const message = `[${
      trade.authMemo
    }] 🗑️ 거래(${trade.amountKrw.toLocaleString()}원) 정보가 ${byWhom(
      msg,
      trade,
    )}삭제되었습니다.`

    setTrades(reject(propEq(trade.id, 'id')))

    sendMsg(trade.buyerChatId, message)
    sendMsg(trade.sellerChatId, message)
    notiAdmin(message)
  }
}
