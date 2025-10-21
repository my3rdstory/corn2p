import { lnAddressInfo } from '../../biz'
import { ellipsisStr, notiAdmin, notiLog } from '../../biz/common'
import { CHAT_ID } from '../../biz/config'
import { emailReg, NOT_ALLOWED_GROUP } from '../../biz/constants'
import { getBuyers, pushBuyer } from '../../biz/db-manager'
import { sendMsg } from '../../biz/get-tele-bot'

export default function newBuyer(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    const lnAddress = match[1]

    const buyers = getBuyers()

    if (buyers.some(item => item.chatId === chatId)) {
      sendMsg(
        chatId,
        '이미 구매자로 등록되어 있습니다.\n\n1. 나의 등록정보 보기👉 /myinfo\n\n2. 구매자 등록 정보 삭제👉 /deletebuyer\n(구매용 지갑 주소를 변경하려면 기존 구매자 정보를 삭제하고 다시 등록해야 합니다.)',
      )
      return
    }

    if (buyers.some(item => item.lnAddress === lnAddress)) {
      sendMsg(chatId, `이미 구매자로 등록된 주소(${lnAddress})입니다`)
      return
    }

    if (!emailReg.test(lnAddress)) {
      sendMsg(
        chatId,
        '이메일 형식의 라이트닝 주소를 입력하세요.\nex) /newbuyer youraddress@strike.me',
      )
      return
    }

    const result = await lnAddressInfo(lnAddress)

    if (result.status === 'ERROR') {
      sendMsg(CHAT_ID.error, `🙅 유효하지 않은 주소입니다. [${result.reason}]`)
      sendMsg(
        chatId,
        `🙅 유효하지 않은 주소입니다. [${ellipsisStr(result.reason)}]`,
      )
      notiLog(`🙅 유효하지 않은 주소입니다. [${ellipsisStr(result.reason)}]`)
      return
    }

    pushBuyer({
      chatId,
      from: msg.from,
      lnAddress,
      tradeAcc: {
        krw: 0,
        count: 0,
        sats: 0,
      },
      todayAcc: {},
      createdAt: Date.now(),
      updatedAt: undefined,
    })

    sendMsg(
      chatId,
      `✅ 구매자 등록이 완료되었습니다.\n\n나의 등록정보 보기👉 /myinfo\n\n1만원 구매하기👉 /10000\n3만원 구매하기👉 /30000\n10만원 구매하기👉 /100000`,
    )

    sendMsg(
      chatId,
      `🙋 잠시만요!\np2phelper 이용이 혹시 처음이시라면 소액으로 먼저 테스트 해보시기 바래요.\n\n소액으로 100원 구매해보기 👉 /100

❗️원화 송금시에는 입금자명으로 본인 이름이 아닌 구매시 안내되는 입금자명 4글자를 넣으셔야 자동으로 사토시 전송 처리가 되는 점 유의해 주세요.`,
    )
    notiAdmin(`🔔[newBuyer] ${lnAddress} joined`)
  }
}
