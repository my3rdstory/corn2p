import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findSeller, updateSeller } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { always, evolve } from '../../utils/lib'

export default function editAccount(bot) {
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

    let account
    if (match[1].split('/').length === 3) {
      account = match[1]
    } else if (match[2] && match[3]) {
      account = `${match[1]}/${match[2]}/${match[3]}`
    } else {
      sendMsg(
        chatId,
        `계좌번호 입력 양식이 유효하지 않습니다.\nex) /editaccount 카카오뱅크/3333-01-11111111/*용*`,
      )
      return
    }

    updateSeller(chatId, evolve({ bankAccount: always(account) }))

    sendMsg(chatId, `[${seller.name}] 🏦 입금계좌 정보가 변경되었습니다.`)
  }
}
