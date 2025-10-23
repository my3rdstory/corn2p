import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findSeller, updateSeller } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { F, evolve } from '../../utils/lib'

export default function showMe(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    const seller = findSeller(chatId)
    if (!seller) {
      sendMsg(chatId, '판매자 정보를 찾을 수 없습니다')
      return
    }

    updateSeller(chatId, evolve({ hidden: F }))

    sendMsg(chatId, `[${seller.name}] 👀 숨김 처리가 해제되었습니다.`)
  }
}
