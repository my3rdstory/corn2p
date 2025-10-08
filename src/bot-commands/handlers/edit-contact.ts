import { linkRegStr, NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findSeller, updateSeller } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { always, evolve } from '../../utils/lib'

export default function editContact(bot) {
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

    const contact = match[1]
    if (!new RegExp(linkRegStr, 'i').test(contact)) {
      sendMsg(
        chatId,
        `텔레그램이나 오픈카톡 링크 등 연락주소를 입력해 주세요. ex) /editcontact https://open.kakao.com/o/xxxxxxx`,
      )
      return
    }

    updateSeller(chatId, evolve({ contact: always(contact) }))

    sendMsg(chatId, `[${seller.name}] 연락처 정보가 변경되었습니다.`)
  }
}
