import { notiAdmin } from '../../biz/common'
import { BUYER_NO_TRADE_LIMIT, CHAT_ID } from '../../biz/config'
import { DAY } from '../../biz/constants'
import { getBuyers, setBuyers } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import dayjsKo from '../../utils/dayjs-ko'
import { propEq, reject } from '../../utils/lib'

export default function adminDeleteBuyer(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }

    const buyer = getBuyers().find(
      item => item.lnAddress === match[1] || String(item.chatId) === match[1],
    )
    if (!buyer) {
      sendMsg(chatId, '해당하는 구매자가 없습니다.')
      return
    }

    if (
      Date.now() - (buyer.updatedAt ?? buyer.createdAt) <
      DAY * BUYER_NO_TRADE_LIMIT
    ) {
      notiAdmin(
        `${buyer.lnAddress} 님의 ${
          buyer.updatedAt ? '마지막 거래는' : '구매자 등록은'
        } ${dayjsKo(buyer.updatedAt ?? buyer.createdAt).fromNow()}입니다.`,
      )
      return
    }

    // 구매자 정보 삭제
    setBuyers(reject(propEq(buyer.lnAddress, 'lnAddress')))

    const message = `🗑️ (마지막 거래 이후 ${BUYER_NO_TRADE_LIMIT}일 이상 만료) ${buyer.lnAddress} 구매자 정보가 삭제되었습니다`
    sendMsg(buyer.chatId, message)
    notiAdmin(message)
  }
}
