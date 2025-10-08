import { MAX_PREMIUM } from '../../biz/config'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findSeller, updateSeller } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { Seller } from '../../types'
import { gtelte } from '../../utils/lib'

export default function editP(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }
    // console.log('chatId', chatId)

    const seller = findSeller(chatId)
    if (!seller) {
      return sendMsg(chatId, '판매자 정보를 찾을 수 없습니다')
    }

    if (!match[1]) {
      return sendMsg(chatId, '프리미엄을 입력해 주세요. ex) /editp 2.1')
    }

    const floatingPoint = match[1].split('.')[1]
    if (floatingPoint && floatingPoint.length > 2) {
      return sendMsg(chatId, '프리미엄은 소수점 2자리까지만 입력 가능합니다')
    }

    const premium = Number(match[1])

    if (Number.isNaN(premium)) {
      return sendMsg(chatId, '프리미엄은 숫자만 입력 가능합니다.')
    }

    if (!gtelte(-MAX_PREMIUM, premium, MAX_PREMIUM)) {
      return sendMsg(
        chatId,
        `프리미엄은 -${MAX_PREMIUM}% ~${MAX_PREMIUM}% 범위로 설정 가능합니다.`,
      )
    }

    updateSeller(chatId, (seller: Seller) => ({
      ...seller,
      premium,
      from: msg.from, // from 이 undefined 인 경우가 있을 수 있어서 evolve 사용하지 않음
    }))

    sendMsg(
      chatId,
      `[${seller.name}] 💸 프리미엄이 ${premium}% 로 변경되었습니다.`,
    )
  }
}
