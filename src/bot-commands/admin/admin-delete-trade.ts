import { notiAdmin } from '../../biz/common'
import { CHAT_ID } from '../../biz/config'
import { findTrade, findTradeByAuthMemo, setTrades } from '../../biz/db-manager'
import { propEq, reject } from '../../utils/lib'
import logger from '../../utils/logger'

export default function adminDeleteTrade(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }
    const tradeId = match[1]
    logger.verbose(`[admindeletetrade] ${JSON.stringify({ chatId, tradeId })}`)

    const trade = findTrade(tradeId) ?? findTradeByAuthMemo(tradeId)
    if (!trade) {
      notiAdmin('해당하는 거래가 없습니다.')
      return
    }

    setTrades(reject(propEq(trade.id, 'id')))

    notiAdmin(`🗑️ ${trade.id} 거래(${trade.authMemo}) 정보가 삭제되었습니다`)
  }
}
