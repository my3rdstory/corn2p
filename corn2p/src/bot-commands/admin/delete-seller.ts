import { notiAdmin } from '../../biz/common'
import { CHAT_ID, SELLER_NO_TRADE_LIMIT } from '../../biz/config'
import { DAY } from '../../biz/constants'
import { getSellers, setSellers } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { popWs } from '../../biz/ws-manager'
import { propEq, reject } from '../../utils/lib'

export default function adminDeleteSeller(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }
    const sellerName = match[1]

    const seller = getSellers().find(propEq(sellerName, 'name'))
    if (!seller) {
      sendMsg(chatId, '해당하는 판매자가 없습니다.')
      return
    }

    if (
      Date.now() <
      (seller.lastTradeAt || seller.createdAt) + SELLER_NO_TRADE_LIMIT * DAY
    ) {
      sendMsg(chatId, `[${seller.name}] 삭제 대상이 아닙니다.`)
      return
    }

    // 활성화된 웹소켓 제거
    if (seller.pushBulletKey) {
      popWs(seller.chatId)
    }

    // 판매자 정보 삭제
    setSellers(reject(propEq(seller.chatId, 'chatId')))

    const message = `🗑️ (마지막 거래 이후 ${SELLER_NO_TRADE_LIMIT}일 이상 만료) ${sellerName} 판매자 정보가 삭제되었습니다`
    sendMsg(seller.chatId, message)
    notiAdmin(message)
  }
}
