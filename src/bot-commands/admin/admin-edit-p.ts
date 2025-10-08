import { CHAT_ID } from '../../biz/config'
import { getSellers, updateSeller } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { Seller } from '../../types'
import { gtelte, propEq } from '../../utils/lib'

export default function adminEditP(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }
    const sellerName = match[1]
    const premium = Number(match[2])

    const seller = getSellers().find(propEq(sellerName, 'name'))
    if (!seller) {
      sendMsg(chatId, '판매자 정보를 찾을 수 없습니다')
      return
    }

    if (!match[1]) {
      sendMsg(chatId, '프리미엄을 입력해 주세요. ex) /editp 2.1')
      return
    }

    const floatingPoint = match[1].split('.')[1]
    if (floatingPoint && floatingPoint.length > 2) {
      sendMsg(chatId, '프리미엄은 소수점 2자리까지만 입력 가능합니다')
      return
    }

    if (Number.isNaN(premium)) {
      sendMsg(chatId, '프리미엄은 숫자만 입력 가능합니다.')
      return
    }

    if (!gtelte(-10, premium, 10)) {
      sendMsg(chatId, '프리미엄은 -10% ~10% 범위로 설정 가능합니다.')
      return
    }

    updateSeller(seller.chatId, (seller: Seller) => ({
      ...seller,
      premium,
    }))

    sendMsg(
      chatId,
      `[${seller.name}] 💸 프리미엄이 ${premium}% 로 변경되었습니다.`,
    )
    sendMsg(
      seller.chatId,
      `[${seller.name}] 💸 관리자가 프리미엄을 ${premium}% 로 변경하였습니다.`,
    )
  }
}
