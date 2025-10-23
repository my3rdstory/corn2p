import { CHAT_ID } from '../../biz/config'
import { getSellers, updateSeller } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { evolve, propEq, T } from '../../utils/lib'

export default function adminHideMe(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }
    const sellerName = match[1]

    const seller = getSellers().find(propEq(sellerName, 'name'))
    if (!seller) {
      sendMsg(chatId, '판매자 정보를 찾을 수 없습니다')
      return
    }

    updateSeller(seller.chatId, evolve({ hidden: T }))

    const message = `[${seller.name}] 💸 판매자가 관리자에 의해 숨김 처리되었습니다`

    sendMsg(chatId, message)
    sendMsg(seller.chatId, message)
  }
}
