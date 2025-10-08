import { notPaidTradeTldr, splitAndSend } from '../../biz'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { getTrades } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { Trade } from '../../types'

export default function tradesNotPaid(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }
    const list: Trade[] = getTrades().filter(
      item => item.sellerChatId === chatId && !item.satsSended,
    )

    if (list.length === 0) {
      sendMsg(chatId, 'No result')
      return
    }

    splitAndSend<Trade>({
      count: 20,
      chatId,
      list,
      serialize: notPaidTradeTldr,
      itemDelimeter: '\n\n\n',
    })

    const failedTrade = list.find(
      trade => !!trade.krwPaidAt && !trade.satsSended,
    )
    if (failedTrade) {
      sendMsg(
        chatId,
        `🙋 [${failedTrade.authMemo}] 건에 대하여 /tnp 를 이용한 비트코인 전송이 반복적으로 실패한다면 지갑에서 실제로 비트코인이 출금 되었는 지 여부를 먼저 확인해 주세요.

지갑에서 실제로 출금이 되지 않았다면 수동으로 직접 구매자에게 비트코인을 전송해 주시면 됩니다.

비트코인 전송이 완료되었다면 위의 tnp 목록에서 해당 건의 '비트코인 전송을 완료했다면 클릭👉' 을 클릭하시면 해당 거래의 정산이 완료됩니다.

※ 일반적으로 'Pending' 또는 'Payment was already processed' 등의 오류는 지갑에서 실제로 출금이 발생했을 수도 또는 안했을 수도 있지만 p2p봇에서는 실패로 인식되는 경우입니다. 그러므로 지갑에서 출금여부를 반드시 먼저 확인하세요.`,
      )
    }
  }
}
