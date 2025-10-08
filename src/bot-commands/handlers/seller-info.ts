import { serializeSellerPublic } from '../../biz'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { getSellers } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { propEq } from '../../utils/lib'

export default function sellerInfo(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    const sellerName = match[1]

    const seller = getSellers().find(propEq(sellerName, 'name'))

    if (!seller || seller.hidden) {
      sendMsg(chatId, '해당하는 판매자가 없습니다.')
      return
    }

    sendMsg(chatId, await serializeSellerPublic(seller))
  }
}
