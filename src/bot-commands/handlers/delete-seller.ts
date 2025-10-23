import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findSeller, setSellers } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { popWs } from '../../biz/ws-manager'
import { propEq, reject } from '../../utils/lib'

export default function deleteSeller(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    const seller = findSeller(chatId)
    if (!seller) {
      sendMsg(chatId, '삭제할 판매자 정보가 없습니다')
      return
    }

    if (seller.pushBulletKey) {
      popWs(seller.chatId)
    }
    setSellers(reject(propEq(chatId, 'chatId')))

    sendMsg(chatId, '🗑️ 판매자 정보가 삭제되었습니다')
  }
}
