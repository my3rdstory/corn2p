import { getBtcPrice, getSellerList } from '../../biz'
import buySats from '../../biz/buy-sats'
import { NO_ADDRESS, NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findBuyer } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { propEq } from '../../utils/lib'

export default function buy(bot) {
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

    const sellerName = match[1]

    if (!sellerName) {
      sendMsg(
        chatId,
        `아래와 같이 입력해 주세요.

** 특정 금액으로 구매        
/buy {판매자이름} {구매금액(₩)}

** 구매 가능 최대 금액으로 구매
/buy {판매자이름}`,
      )
      return
    }

    const sellerList = await getSellerList()
    const sellers = sellerList.filter(item => item.enabled && !item.hidden)

    const seller = sellers.find(propEq(sellerName, 'name'))
    if (!seller) {
      sendMsg(chatId, `판매자 이름이 유효하지 않습니다.`)
      return
    }

    const btcPrice = await getBtcPrice()

    const amountKrw = match[2]
      ? Number(match[2].replaceAll(',', ''))
      : seller.maxKrw

    await buySats({
      msg,
      seller,
      amountKrw,
      btcPrice,
      buyer,
    })
  }
}
