import { byWhom, notiAdmin } from '../../biz/common'
import { KRW_DEPOSIT_EXPIRE_ALARM } from '../../biz/config'
import { MINUTE } from '../../biz/constants'
import { findTrade, setTrades } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { propEq, reject } from '../../utils/lib'

export default function deleteTradeNotPaid(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    const tradeId = match[1]

    const trade = findTrade(tradeId)
    if (!trade) {
      sendMsg(chatId, '해당하는 거래가 없습니다.')
      return
    }

    if (trade.krwPaidAt) {
      sendMsg(chatId, '입금이 완료된 거래는 삭제할 수 없습니다.')
      return
    }

    if (Date.now() < trade.createdAt + KRW_DEPOSIT_EXPIRE_ALARM * MINUTE) {
      sendMsg(
        chatId,
        `원화 입금을 대기 중인 거래입니다. 거래 생성 후 ${KRW_DEPOSIT_EXPIRE_ALARM}분이 경과되기 전까지는 해당 거래를 삭제할 수 없습니다.`,
      )
      return
    }

    const message = `[${
      trade.authMemo
    }] 🗑️ 거래(${trade.amountKrw.toLocaleString()}원) 정보가 ${byWhom(
      msg,
      trade,
    )}삭제되었습니다.`

    setTrades(reject(propEq(trade.id, 'id')))

    sendMsg(trade.sellerChatId, message)
    sendMsg(trade.buyerChatId, message)
    notiAdmin(message)
  }
}
