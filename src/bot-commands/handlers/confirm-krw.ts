import { tradeTldr } from '../../biz'
import { CHAT_ID } from '../../biz/config'
import { findTrade } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'

export default function confirmKrw(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    const tradeId = match[1]

    const trade = findTrade(tradeId)
    if (!trade) {
      sendMsg(chatId, '해당하는 거래가 없습니다.')
      return
    }

    if (trade.sellerChatId !== chatId && chatId !== CHAT_ID.admin) {
      sendMsg(chatId, '거래 입금 확인은 해당 판매자만 가능합니다.')
      return
    }
    if (trade.satsSended && trade.txFeePaid) {
      sendMsg(chatId, '거래가 완료된 건입니다.')
      return
    }

    sendMsg(
      chatId,
      `${tradeTldr(trade)}\n\n해당 거래의 원화 입금이 확인되었습니까?
구매자의 원화 송금(${trade.amountKrw.toLocaleString()}원 & ${
        trade.authMemo
      })이 확인되었다면 아래 버튼을 클릭해 비트코인을 전송해 주세요.

※ 주의) 한번 전송된 비트코인은 되돌릴 수 없습니다.

아래 명령을 클릭하여 구매자(${
        trade.lnAddress
      })에게 비트코인(${trade.amountSats.toLocaleString()}sats) 전송!
👉 /confirmkrwandsendsats_${tradeId}`,
    )
  }
}
