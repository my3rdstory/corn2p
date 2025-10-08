import { nameEmoji } from '../../biz'
import { getSatsBalance, manUint, username } from '../../biz/common'
import { CHAT_ID, SELLER_NO_TRADE_LIMIT } from '../../biz/config'
import { getSellers } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import dayjsKo from '../../utils/dayjs-ko'

export default function allSellers(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }

    const list = getSellers()
    if (list.length === 0) {
      sendMsg(chatId, 'No result')
      return
    }
    const balances = await Promise.all(
      list.map(async item => getSatsBalance(item.apiKey)),
    )

    const message = list
      .map(
        (item, idx) =>
          `${nameEmoji(item)}  ${item.premium}%  ${manUint(
            balances[idx].satsBalance,
            false,
          )}sats ${item.enabled ? '✅' : '❌'} ${item.hidden ? '🙈' : '👀'}
${item.tradeAcc.count}건 ${manUint(item.tradeAcc.krw, false)}원 ${manUint(
            item.tradeAcc.sats,
            false,
          )}sats ${dayjsKo(item.lastTradeAt || item.createdAt).fromNow()}${
            Date.now() - (item.lastTradeAt || item.createdAt) > // 최초 판매자 등록시 lastTradeAt 은 0
            1000 * 60 * 60 * 24 * SELLER_NO_TRADE_LIMIT
              ? ' (🗑️삭제대상)'
              : ''
          }${item.from ? `\n${username(item.from)}` : ''}`,
      )
      .join('\n\n')

    sendMsg(
      chatId,
      `** all sellers ${list.length}명
${message}`,
    )
  }
}
