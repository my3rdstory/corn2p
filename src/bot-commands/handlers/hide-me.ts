import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findSeller, updateSeller } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { T, evolve } from '../../utils/lib'

export default function hideMe(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    // console.log('chatId', chatId)

    const seller = findSeller(chatId)
    if (!seller) {
      sendMsg(chatId, '판매자 정보를 찾을 수 없습니다')
      return
    }

    updateSeller(chatId, evolve({ hidden: T })) // if (seller.pushBulletKey) {

    sendMsg(chatId, `[${seller.name}] 🙈 판매자 목록에서 숨김 처리되었습니다.`)
  }
}
