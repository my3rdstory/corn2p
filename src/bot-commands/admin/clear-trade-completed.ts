import { CHAT_ID } from '../../biz/config'
import { getTrades, setTrades } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { Trade } from '../../types'
import { reject } from '../../utils/lib'

export default function clearTradeCompleted(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    if (chatId !== CHAT_ID.admin) {
      return
    }

    const donePred = (item: Trade) =>
      !!item.krwPaidAt && item.satsSended && item.txFeePaid

    const targets = getTrades().filter(donePred)

    setTrades(reject(donePred))

    sendMsg(chatId, `🗑️ 거래 완료 ${targets.length}건이 모두 삭제되었습니다.`)
  }
}
