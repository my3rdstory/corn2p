import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findBuyer, setBuyers } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { propEq, reject } from '../../utils/lib'

export default function deleteBuyer(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    const buyer = findBuyer(chatId)
    if (!buyer) {
      sendMsg(chatId, '삭제할 구매자 정보가 없습니다.')
      return
    }
    setBuyers(reject(propEq(chatId, 'chatId')))
    sendMsg(chatId, '🗑️ 구매자 정보가 삭제되었습니다')
  }
}
