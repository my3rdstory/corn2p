import { getBtcPrice, getSellerList } from '../../biz'
import buySats from '../../biz/buy-sats'
import { OUT_OF_AMOUNT_RANGE } from '../../biz/common'
import { BUYER_AMOUNT_MAX, BUYER_AMOUNT_MIN } from '../../biz/config'
import { NO_ADDRESS, NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findBuyer } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { gtelte } from '../../utils/lib'

export default function amountBuy(bot) {
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

    const amountKrw = Number(match[1])

    if (!Number.isInteger(amountKrw)) {
      sendMsg(chatId, '구매 금액이 유효하지 않습니다.')
      return
    }

    if (!gtelte(BUYER_AMOUNT_MIN, amountKrw, BUYER_AMOUNT_MAX)) {
      sendMsg(chatId, OUT_OF_AMOUNT_RANGE)
      return
    }

    const [btcPrice, list] = await Promise.all([getBtcPrice(), getSellerList()])
    const seller = list.find(
      item =>
        amountKrw <= item.maxKrw &&
        item.satsNotSended.filter(trade => trade.expiredAt < Date.now())
          .length === 0,
    )
    if (!seller) {
      sendMsg(chatId, `구매 가능한 판매자가 없습니다.`)
      return
    }

    await buySats({ msg, seller, amountKrw, btcPrice, buyer })
  }
}
