import { getAmountSats, serializeTrade, tradeTldr } from '.'
import { Buyer, Msg, SellerWithBalance } from '../types'
import { COUNT, gtelte } from '../utils/lib'
import { notiAdmin, notiLog, OUT_OF_AMOUNT_RANGE } from './common'
import {
  BUYER_AMOUNT_MAX,
  BUYER_AMOUNT_MIN,
  KRW_DEPOSIT_EXPIRE,
  KRW_DEPOSIT_EXPIRE_ALARM,
  MAX_LENGTH_TRADES_NOT_PAID,
  TOO_MANY_REQUEST_LIMIT,
} from './config'
import { MINUTE } from './constants'
import createTrade from './create-trade'
import { findTrade, getTrades, updateBuyer } from './db-manager'
import { sendMsg } from './get-tele-bot'

interface BuySats {
  seller: SellerWithBalance
  amountKrw: number
  msg: Msg
  btcPrice: number
  buyer: Buyer
}

export default async function buySats({
  seller,
  amountKrw,
  msg,
  btcPrice,
  buyer,
}: BuySats) {
  const chatId = msg.chat.id

  if (COUNT.sendMessage > TOO_MANY_REQUEST_LIMIT) {
    const msg = `🙋 과도한 트래픽으로 현재 신규 거래 생성이 불가합니다. 잠시 후 다시 이용해 주세요. (예상 소요시간 약 ${COUNT.sendMessage}초)`
    sendMsg(chatId, msg)
    notiLog(msg)
    console.log(`[${buyer.lnAddress}] ${msg}`)
    return
  }

  if (!gtelte(BUYER_AMOUNT_MIN, amountKrw, BUYER_AMOUNT_MAX)) {
    notiLog(OUT_OF_AMOUNT_RANGE)
    sendMsg(chatId, OUT_OF_AMOUNT_RANGE)
    return
  }

  if (!(btcPrice && Number.isInteger(btcPrice))) {
    sendMsg(chatId, 'UPBIT_BTC_PRICE_ERROR')
    notiLog('UPBIT_BTC_PRICE_ERROR')
    return
  }

  if (amountKrw > seller.maxKrw) {
    sendMsg(
      chatId,
      `🙅 해당 판매자의 최대 구매금액(${seller.maxKrw.toLocaleString()}원)을 초과하였습니다.`,
    )
    return
  }

  if (
    seller.satsNotSended.filter(trade => trade.expiredAt < Date.now()).length >
    0
  ) {
    sendMsg(
      chatId,
      `🙅 미정산 거래가 남아있는 판매자에게는 구매가 불가합니다. 다른 판매자에게 구매해 주세요.`,
    )
    return
  }

  const tradesNotPaid = await tradesNotPaidForBuyer(chatId)
  if (tradesNotPaid.length >= MAX_LENGTH_TRADES_NOT_PAID) {
    const msg = `🙅 미정산 거래는 최대 ${MAX_LENGTH_TRADES_NOT_PAID}개를 초과할 수 없습니다. 새로운 거래를 생성하시려면 미정산 거래들을 먼저 정리해 주세요.`
    sendMsg(chatId, msg)
    notiLog(msg)
    return
  }

  const { satsBalance } = seller.balance

  const { feeSats, amountSats, fullSats } = getAmountSats({
    btcPrice,
    amountKrw,
    premium: seller.premium,
  })

  /**
   * 라이트닝 월렛 잔액 체크
   * 혹시 몰라서 한번 더 체크해 주는 것임
   */
  if (satsBalance * 0.95 < amountSats) {
    return sendMsg(chatId, `Not enough seller's satsBalance.`)
  }

  const trade = await createTrade({
    seller,
    buyer,
    amountKrw,
    amountSats,
    btcPrice,
    fullSats,
    feeSats,
    sellerSatsBalance: satsBalance,
  })
  updateBuyer(msg.chat.id, (buyer: Buyer) => ({ ...buyer, from: msg.from }))

  setTimeout(async () => {
    try {
      const _trade = findTrade(trade.id)

      if (_trade && !_trade.krwPaidAt) {
        const msg = `${trade.sellerName}${
          trade.authMemo
        }(${trade.amountKrw.toLocaleString()}원) ⏰ 거래(${
          trade.id
        }) 원화 입금 대기 시간 만료`
        sendMsg(chatId, msg)
        sendMsg(trade.sellerChatId, msg + `\n\n` + tnpAction(_trade.id))
        notiAdmin(msg)
      }
    } catch (err: any) {
      notiLog(`[buySats-setTimeout] ${err.message}`, { level: 'error' })
    }
  }, KRW_DEPOSIT_EXPIRE * MINUTE)

  setTimeout(async () => {
    try {
      const _trade = findTrade(trade.id)
      if (_trade && !_trade.krwPaidAt) {
        // setTrades(reject(propEq(trade.id, 'id')))
        const msg = `${trade.sellerName}${trade.authMemo} 📣 거래(${
          trade.id
        }) 원화 입금 대기 만료 ${
          KRW_DEPOSIT_EXPIRE - KRW_DEPOSIT_EXPIRE_ALARM
        }분 전`
        sendMsg(chatId, msg)
        sendMsg(trade.sellerChatId, msg)
        notiAdmin(msg)
      }
    } catch (err: any) {
      notiLog(`[buySats-setTimeout] ${err.message}`, { level: 'error' })
    }
  }, KRW_DEPOSIT_EXPIRE_ALARM * MINUTE)

  const message = tradeTldr(trade)

  // 판매자 알림
  sendMsg(trade.sellerChatId, message)

  // 관리자 알림
  notiAdmin(message)

  // 구매자 알림
  sendMsg(
    chatId,
    `새로운 거래가 생성되었습니다. 아래 은행 계좌로 ${KRW_DEPOSIT_EXPIRE}분 안에 원화 송금을 완료해 주세요.

${serializeTrade(trade)}


⚠️ 주의 사항 ---
* 불법거래 및 자금세탁 용도로 서비스 이용을 금지하며 적발시 수사 당국에 즉각 고발 조치합니다.
* p2p 거래에 대한 책임은 온전히 거래 당사자들에게 있으며 서비스 제공자는 이에 대해 책임지거나 관여하지 않습니다.
* 송금액과 입금자명이 일치하지 않으면 라이트닝 전송이 실패합니다.
* 반복적인 p2p 거래로 인한 계좌 입출금 내역은 은행의 의심거래보고(STR) 대상이 될 수 있습니다.
* 라이트닝 전송을 정상적으로 받지 못했다면 판매자에게 직접 문의해 주세요. 
* 판매자 연락처: ${seller.contact}`,
  )

  sendMsg(
    chatId,
    [
      ...trade.bankAccount.split('/'),
      trade.amountKrw.toLocaleString() + '원',
    ].join(' '),
  )

  sendMsg(chatId, trade.authMemo)
  sendMsg(
    chatId,
    `거래를 취소하시려면 아래 명령을 클릭해 주세요.
'${trade.authMemo}' 취소🗑️ /deletetrade_${trade.id}`,
  )

  if (!seller.pushBulletKey) {
    sendMsg(
      chatId,
      `🙋‍♀️ 아이폰🍎 판매자에게 구매할 경우에는 사토시가 자동 전송되지 않고 판매자가 직접 원화 입금 확인 후 사토시 전송이 이뤄지는 점 참고해 주세요`,
    )
  }
}

export const tnpAction = (
  tradeId: string,
) => `원화 입금 확인되어 라이트닝 전송⚡️ /confirmkrw_${tradeId}
or
원화 미입금으로 해당 거래 삭제🗑️ /deletetradenotpaid_${tradeId}`

export const tradesNotPaidForBuyer = async (buyerChatId: number) => {
  const tradesNotPaid = getTrades().filter(
    item => item.buyerChatId === buyerChatId && !item.krwPaidAt,
  )
  if (tradesNotPaid.length > 0) {
    const message = tradesNotPaid
      .map(
        item =>
          `${tradeTldr(item, { status: true, feeInfo: false })}

'${item.authMemo}' 취소🗑️ /deletetrade_${item.id}`,
      )
      .join('\n\n')

    sendMsg(
      buyerChatId,
      `🙋‍♀️ 원화 송금이 완료되지 않은 이전 거래가 남아 있습니다. 원화 송금을 완료했다면 판매자에게 사토시 전송을 문의해 주시고 취소하시려면 해당 거래를 취소해 주세요.\n\n` +
        message,
    )
  }
  return tradesNotPaid
}
