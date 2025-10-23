import { after3days } from '../../biz'
import { CHAT_ID } from '../../biz/config'
import { getTrades, setTrades } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { reject } from '../../utils/lib'

export default function clearTradeNotPaid(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    if (chatId !== CHAT_ID.admin) {
      return
    }

    const count = getTrades().filter(after3days).length
    if (count === 0) {
      sendMsg(chatId, '삭제 대상 건이 없습니다.')
      return
    }

    setTrades(reject(after3days))

    sendMsg(
      chatId,
      `🗑️ 만료 후 3일 이상 지난 원화 미입금 ${count}건이 모두 삭제되었습니다.`,
    )
  }
}
