import { checkPayment } from '../../biz'
import { CHAT_ID } from '../../biz/config'
import { findSeller, findTrade } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'

export default function confirmKrwAndSendSats(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    const tradeId = match[1]

    const trade = findTrade(tradeId)
    if (!trade) {
      sendMsg(chatId, '해당하는 거래가 없습니다.')
      return
    }

    if (trade.satsSended && trade.txFeePaid) {
      sendMsg(chatId, '이미 거래가 완료된 건입니다.')
      return
    }

    if (trade.sellerChatId !== chatId && chatId !== CHAT_ID.admin) {
      sendMsg(chatId, '해당 판매자만 수행 가능한 명령입니다.')
      return
    }

    const seller = findSeller(trade.sellerChatId)

    if (!seller) {
      sendMsg(chatId, '판매자 정보가 존재하지 않습니다.')
      return
    }

    await checkPayment(
      {
        push: {
          title: '입금 ',
          body: `${trade.authMemo} ${trade.amountKrw.toLocaleString()}원`,
        },
      },
      seller,
      true, // 판매자 승인 플래그
    )
  }
}
