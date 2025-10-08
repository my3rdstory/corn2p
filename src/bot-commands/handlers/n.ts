import { getBtcPrice, getSellerList } from '../../biz'
import buySats from '../../biz/buy-sats'
import { NO_ADDRESS, NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findBuyer } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { SellerWithBalance } from '../../types'

export default function n(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }
    const buyer = findBuyer(chatId)
    if (!buyer) {
      sendMsg(chatId, NO_ADDRESS)
      return
    }

    const [btcPrice, sellerList] = await Promise.all([
      getBtcPrice(),
      getSellerList(),
    ])

    const seller: SellerWithBalance = sellerList[Number(match[1]) - 1]

    if (!seller) {
      sendMsg(chatId, `해당하는 판매자가 없습니다.`)
      return
    }
    const amountKrw = match[2]
      ? Number(match[2].replaceAll(',', ''))
      : seller.maxKrw

    await buySats({ msg, seller, amountKrw, btcPrice, buyer })
  }
}
