import { splitAndSend } from '../../biz'
import { manUint, username } from '../../biz/common'
import { BUYER_NO_TRADE_LIMIT, CHAT_ID } from '../../biz/config'
import { DAY } from '../../biz/constants'
import { getBuyers } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'
import { Buyer } from '../../types'
import dayjsKo from '../../utils/dayjs-ko'
import { dateFormat, sort } from '../../utils/lib'

export default function allBuyers(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId !== CHAT_ID.admin) {
      return
    }

    const buyers = getBuyers()
    if (buyers.length === 0) {
      return sendMsg(chatId, 'No result')
    }

    const now = Date.now()
    const sortedBuyers = sort(
      (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
      buyers,
    )

    splitAndSend<Buyer>({
      chatId,
      list: sortedBuyers,
      serialize: (
        { lnAddress, createdAt, updatedAt, tradeAcc, from, chatId },
        idx,
        arr,
        pageIdx,
      ) =>
        `${pageIdx + idx + 1}. ${
          from ? username(from) + '\n' : ''
        }${lnAddress}\n${dateFormat(createdAt, 'M/D')}  ${
          tradeAcc?.count ?? 0
        }건  ${manUint(tradeAcc?.krw ?? 0, false)}원  ${manUint(
          tradeAcc?.sats ?? 0,
          false,
        )}sats  ${updatedAt ? dayjsKo(updatedAt).fromNow() : '-'} ${
          now - (updatedAt ?? createdAt) > BUYER_NO_TRADE_LIMIT * DAY
            ? `🗑️ /admindeletebuyer_${chatId}`
            : ''
        }`,
    })
  }
}
