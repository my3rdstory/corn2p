import { createQuote, lnAddressInfo, validateNewSellerParams } from '../../biz'
import {
  genAuthMemo,
  notiAdmin,
  notiLog,
  sendSatsBlink,
  sendSatsStrike,
} from '../../biz/common'
import { ADMIN_ADDRESS, CHAT_ID, SELLER_JOIN_FEE } from '../../biz/config'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findSeller, getSellers, pushSeller } from '../../biz/db-manager'
import { encrypt } from '../../biz/encrypt'
import { sendMsg } from '../../biz/get-tele-bot'
import { Seller } from '../../types'
import { dateFormat, propEq, req } from '../../utils/lib'
import logger from '../../utils/logger'

export default function newSellerIphone(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    if (!(match[1] && match[2] && match[3] && match[4] && match[5])) {
      const msg = `🙋‍♀️ 판매자 등록에 필요한 입력 정보가 누락되었습니다.
아래와 같이 명령어 뒤에 5개의 정보를 띄어쓰기로 구별해서 모두 입력해 주세요!

ex) /newselleriphone 이름 프리미엄 지갑apiKey 입금계좌정보 연락처정보`
      sendMsg(chatId, msg)
      sendMsg(CHAT_ID.error, msg)
      return
    }

    try {
      await validateNewSellerParams({
        name: match[1],
        premium: match[2],
        apiKey: match[3],
        bankAccount: match[4],
        contact: match[5],
      })
    } catch (e: any) {
      const msg = e.message.replace('AssertionError: ', '')
      sendMsg(chatId, msg)
      sendMsg(CHAT_ID.error, msg)
      notiLog(msg)
      return
    }

    const name = match[1]
    if (!name) {
      const msg =
        '/newselleriphone 명령 뒤에 "이름 프리미엄 지갑api키 계좌번호 카톡주소" 값을 추가로 입력해야 합니다.'
      sendMsg(chatId, msg)
      sendMsg(CHAT_ID.error, msg)
      notiLog(msg)
      return
    }
    const premium = Number(match[2])
    const apiKey = match[3]
    const bankAccount = match[4]
    const contact = match[5]

    if (findSeller(chatId)) {
      const msg = `[newselleriphone] 이미 판매자로 등록되어 있습니다. [${name}]`
      sendMsg(chatId, msg)
      sendMsg(CHAT_ID.error, msg)
      notiLog(msg)
      return
    }

    if (getSellers().some(propEq(name, 'name'))) {
      const msg = `[newselleriphone] 기존 판매자와 이름 중복 [${name}]`
      sendMsg(chatId, msg)
      sendMsg(CHAT_ID.error, msg)
      notiLog(msg)
      return
    }

    const memo = `[newSeller] ${name} ${dateFormat()}`

    if (apiKey.startsWith('blink_')) {
      const info = await lnAddressInfo(ADMIN_ADDRESS)
      const { pr: prFee } = await req.get(info.callback, {
        amount: SELLER_JOIN_FEE * 1000,
      })
      const result = await sendSatsBlink({
        blinkApiKey: apiKey,
        paymentLnInvoice: prFee,
        memo,
      })

      logger.verbose(
        `newSelleriphone-sendSatsBlink result: [${JSON.stringify(result)}]`,
      )

      if (
        !(
          result.lnInvoicePaymentSend?.status === 'SUCCESS' ||
          result.lnInvoicePaymentSend?.status === 'ALREADY_PAID' ||
          result.lnInvoicePaymentSend?.errors?.[0]?.message ===
            'Invoice is already paid'
        )
      ) {
        await bot.setMessage(chatId, '라이트닝 지갑 apiKey 권한 오류')
        return
      }
    } else {
      let quoteTx = await createQuote({
        lnAddress: ADMIN_ADDRESS,
        amountSats: SELLER_JOIN_FEE,
        memo,
        apiKey,
      })
      logger.verbose(`[Quote created] ${JSON.stringify(quoteTx)}`)

      if (!quoteTx.paymentQuoteId) {
        const msg = `[Strike] Quote creation error. ${JSON.stringify(quoteTx)}`
        sendMsg(chatId, msg)
        sendMsg(CHAT_ID.error, msg)
        notiLog(msg)
        return
      }

      await sendSatsStrike({
        apiKey,
        paymentQuoteId: quoteTx.paymentQuoteId,
      })
    }

    const authMemo = genAuthMemo()
    const seller: Seller = {
      chatId,
      name,
      premium,
      apiKey: encrypt(apiKey),
      pushBulletKey: '',
      bankAccount,
      contact,
      hidden: false,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastTradeAt: 0,
      authMemo,
      tradeAcc: {
        krw: 0,
        count: 0,
        sats: 0,
      },
      from: msg.from,
      todayAcc: {},
    }

    // await pushWs(seller)
    pushSeller(seller)
    notiAdmin(`[newSeller] ${name} registered. [${seller.authMemo}]`)
    notiLog(`[newSeller] ${name} registered. [${seller.authMemo}]`)

    sendMsg(
      chatId,
      `판매자 등록 수수료 ${SELLER_JOIN_FEE} sats 출금 완료 ✅
판매자 정보가 등록되었습니다.`,
    )
    notiLog(`판매자 등록 수수료 ${SELLER_JOIN_FEE} sats 출금 완료 ✅
판매자 정보가 등록되었습니다.`)
  }
}
