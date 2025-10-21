import { username } from '../../biz/common'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { getBuyers } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import dayjsKo from '../../utils/dayjs-ko'
import { propEq } from '../../utils/lib'

export default function buyerInfo(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }
    const lnAddress = match[1]

    const buyer = getBuyers().find(propEq(lnAddress, 'lnAddress'))

    if (!buyer) {
      sendMsg(chatId, '해당하는 구매자가 없습니다.')
      return
    }

    const { from, updatedAt } = buyer

    const message = `📄 구매자 정보
---
입금주소: ${lnAddress}
텔레계정: ${from ? username(from) : '-'}
마지막거래: ${updatedAt ? dayjsKo(updatedAt).fromNow() : '없음'}`

    sendMsg(chatId, message)
  }
}
