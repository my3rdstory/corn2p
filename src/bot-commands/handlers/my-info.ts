import { getBtcPrice, serializeBuyer, serializeSeller } from '../../biz'
import { tradesNotPaidForBuyer } from '../../biz/buy-sats'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findBuyer, findSeller } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'

export default function myInfo(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }
    const btcPrice = await getBtcPrice()

    const seller = findSeller(chatId)
    const buyer = findBuyer(chatId)

    if (buyer) {
      sendMsg(
        chatId,
        `📄 구매자 정보
---
${buyer ? serializeBuyer(buyer, btcPrice) : 'N/A'}`,
      )
    }

    await tradesNotPaidForBuyer(chatId)

    if (seller) {
      sendMsg(
        chatId,
        `📄 판매자 정보
---
${seller ? await serializeSeller(seller) : 'N/A'}`,
      )
    }

    if (!buyer && !seller) {
      sendMsg(chatId, '등록된 정보가 없습니다.')
    }
  }
}
