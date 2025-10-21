import { createQuote, lnAddressInfo, validateNewSellerParams } from '../../biz'
import {
  genAuthMemo,
  notiAdmin,
  notiLog,
  sendSatsBlink,
  sendSatsStrike,
} from '../../biz/common'
import {
  ADMIN_ADDRESS,
  SELLER_JOIN_FEE,
  SELLER_JOIN_KRW,
} from '../../biz/config'
import { NOT_ALLOWED_GROUP } from '../../biz/constants'
import { findSeller, getSellers, pushSeller } from '../../biz/db-manager'
import { encrypt } from '../../biz/encrypt'
import { sendMsg } from '../../biz/get-tele-bot'
import { pushWs } from '../../biz/ws-manager'
import { Seller } from '../../types'
import { dateFormat, propEq, req } from '../../utils/lib'
import logger from '../../utils/logger'

export default function newSeller(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    if (chatId < 0) {
      sendMsg(chatId, NOT_ALLOWED_GROUP)
      return
    }

    if (
      !(match[1] && match[2] && match[3] && match[4] && match[5] && match[6])
    ) {
      const msg = `🙋‍♀️ 판매자 등록에 필요한 입력 정보가 누락되었습니다.
아래와 같이 명령어 뒤에 6개의 정보를 띄어쓰기로 구별해서 모두 입력해 주세요!

ex) /newseller 이름 프리미엄 지갑apiKey 푸시불릿apiKey 입금계좌정보 연락주소`
      sendMsg(chatId, msg)
      notiAdmin(msg)
      notiLog(msg)
      return
    }

    try {
      await validateNewSellerParams({
        name: match[1],
        premium: match[2],
        apiKey: match[3],
        pushBulletKey: match[4],
        bankAccount: match[5],
        contact: match[6],
      })
    } catch (e: any) {
      const msg = e.message.replace('AssertionError: ', '')
      sendMsg(chatId, msg)
      notiAdmin(msg)
      notiLog(msg)
      return
    }

    const name = match[1]
    if (!name) {
      const msg =
        '/newseller 명령 뒤에 "이름 프리미엄 지갑api키 Pushbullet키 계좌번호 카톡주소" 값을 추가로 입력해야 합니다.'
      sendMsg(chatId, msg)
      notiAdmin(msg)
      notiLog(msg)
      return
    }
    const premium = Number(match[2])
    const apiKey = match[3]
    const pushBulletKey = match[4]
    const bankAccount = match[5]
    const contact = match[6]

    if (findSeller(chatId)) {
      const msg = `[newseller] 이미 판매자로 등록되어 있습니다. [${name}]`
      sendMsg(chatId, msg)
      notiAdmin(msg)
      notiLog(msg)
      return
    }

    if (getSellers().some(propEq(name, 'name'))) {
      const msg = `[newseller] 기존 판매자와 이름 중복 [${name}]`
      sendMsg(chatId, msg)
      notiAdmin(msg)
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
        `newSeller-sendSatsBlink result: [${JSON.stringify(result)}]`,
      )

      if (
        !(
          result.lnInvoicePaymentSend?.status === 'SUCCESS' ||
          result.lnInvoicePaymentSend?.status === 'ALREADY_PAID' ||
          result.lnInvoicePaymentSend?.errors?.[0]?.message ===
            'Invoice is already paid'
        )
      ) {
        sendMsg(chatId, '라이트닝 지갑 apiKey 권한 오류')
        notiAdmin('라이트닝 지갑 apiKey 권한 오류')
        notiLog('라이트닝 지갑 apiKey 권한 오류')
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
        notiAdmin(msg)
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
      pushBulletKey: encrypt(pushBulletKey),
      bankAccount,
      contact,
      hidden: false,
      enabled: false,
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

    await pushWs(seller)
    pushSeller(seller)

    notiAdmin(`[newSeller] ${name} registered. [${seller.authMemo}]`)
    notiLog(`[newSeller] ${name} registered. [${seller.authMemo}]`)
    sendMsg(
      chatId,
      `판매자 등록 수수료 ${SELLER_JOIN_FEE} sats 출금 완료 ✅
판매자 정보가 등록되었습니다.
  
이제 PushBullet 앱에서 입금 계좌의 은행 앱 알림 접근을 허용하신 후, 아래 입금 정보로 송금을 완료해 주세요.
(${SELLER_JOIN_KRW}원 출금하시는 은행은 다른 은행의 계좌를 이용해 주세요. 동일 은행 계좌에서 출금시 알림메세지 충돌로 오류가 발생할 수 있습니다)
====
계좌번호: ${bankAccount}
송금금액: ${SELLER_JOIN_KRW} 원
입금자명: ${authMemo}`,
    )
  }
}
