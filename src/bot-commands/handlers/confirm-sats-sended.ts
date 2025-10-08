import { withdrawSats } from '../../biz'
import { CHAT_ID } from '../../biz/config'
import { findSeller, findTrade } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'

export default function confirmSatsSended(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    const tradeId = match[1]

    const trade = findTrade(tradeId)
    if (!trade) {
      sendMsg(chatId, `해당 거래(${tradeId})를 찾을 수 없습니다.`)
      return
    }

    if (chatId !== CHAT_ID.admin && chatId !== trade.sellerChatId) {
      sendMsg(chatId, '판매자만 해당 명령을 수행할 수 있습니다.')
      return
    }

    if (!trade.krwPaidAt) {
      sendMsg(
        chatId,
        `원화 송금이 확인되지 않은 건입니다. 원화 송금이 확인된 건에 한하여 처리가 가능합니다.`,
      )
      return
    }
    const seller = findSeller(trade.sellerChatId)
    if (!seller) {
      sendMsg(chatId, '판매자 정보가 존재하지 않습니다')
      return
    }

    if (!trade.satsSended || !trade.txFeePaid) {
      await withdrawSats(trade, seller, true) // 3번째 인자 사토시 출금 매뉴얼 확인!!
    } else {
      sendMsg(chatId, `이미 사토시 전송처리가 완료된 건입니다.`)
    }
  }
}
