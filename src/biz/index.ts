import gql from 'graphql-tag'
import { oneOf } from 'mingutils'
import { Buyer, Seller, SellerWithBalance, Trade } from '../types'
import dayjsKo from '../utils/dayjs-ko'
import {
  add,
  always,
  assert,
  assoc,
  compose,
  dateFormat,
  evolve,
  filter,
  fnWithCache,
  groupBy,
  gtelte,
  ifElse,
  inc,
  prop,
  propEq,
  reject,
  req,
  sequentialInvoke,
  sort,
  T,
  update,
} from '../utils/lib'
import logger from '../utils/logger'
import {
  _getSatsBalance,
  getBtcPriceBinance,
  getSatsBalance,
  getWalletInfo,
  getWithdrawLimit,
  manUint,
  notiAdmin,
  notiLog,
  reqGraphql,
  satsToWon,
  sendSatsBlink,
  sendSatsStrike,
  username,
  wonToSats,
} from './common'
import {
  ADMIN_ADDRESS,
  BASED_ON_UPBIT,
  BUYER_AMOUNT_MAX,
  CHAT_ID,
  SELLER_JOIN_KRW,
  SELLER_TODAY_ACC_AMOUNT_KRW_LIMIT,
  SELLER_WALLET_MIN_BALANCE,
  SELLER_WALLET_MIN_KRW,
  TRADE_FEE,
  TRADE_FEE_ALPHA,
  TRADE_FEE_INC_UNIT,
  TRADE_FEE_MIN,
  WATING_NOTI_TIME,
} from './config'
import { BTCUNIT, DAY, MINUTE, strikeApiKeyReg } from './constants'
import {
  findTrade,
  getBuyers,
  getSellers,
  getTrades,
  setBuyers,
  setSellers,
  setTrades,
  updateSeller,
  updateTrade,
} from './db-manager'
import { getDecApiKey, getStrikeApiKey } from './encrypt'
import { sendMsg } from './get-tele-bot'
import krwusdHana from './krwusd-hana'
import krwusdKb from './krwusd-kb'
import krwusdNaver from './krwusd-naver'
import krwusdShinhan from './krwusd-shinhan'
import krwusdWoori from './krwusd-woori'

interface ValidateNewSellerParams {
  name: string
  premium: string
  apiKey: string
  pushBulletKey?: string
  bankAccount: string
  contact: string
}

export const validateNewSellerParams = async ({
  name,
  premium,
  apiKey,
  pushBulletKey,
  bankAccount,
  contact,
}: ValidateNewSellerParams) => {
  assert(
    gtelte(2, name.length, 4),
    `이름의 길이는 2~4 글자까지 가능합니다.[${name}]`,
  )
  assert(!name.includes('✨'), `이름에 ✨ 는 포함하실 수 없습니다.`)
  assert(!name.includes('🍎'), `이름에 🍎 는 포함하실 수 없습니다.`)

  const _premium = Number(premium)
  assert(
    typeof _premium === 'number' && !Number.isNaN(_premium),
    `프리미엄은 숫자만 가능합니다.`,
  )
  assert(gtelte(-10, _premium, 10), `프리미엄은 -10% ~ 10% 까지만 가능합니다.`)

  assert(
    new RegExp(strikeApiKeyReg).test(apiKey) || apiKey.startsWith('blink_'),
    `지갑 apiKey 가 유효하지 않습니다.`,
  )

  assert(
    !pushBulletKey || pushBulletKey.startsWith('o.'),
    `푸시불릿 Key 가 유효하지 않습니다.`,
  )
  assert(
    !pushBulletKey || pushBulletKey.length === 34,
    `푸시불릿 Key 의 길이가 유효하지 않습니다.`,
  )

  const { satsBalance } = await _getSatsBalance(apiKey).catch(err => {
    throw Error(`[지갑 잔액 조회 오류] ${err.message}`)
  })

  assert(
    satsBalance >= 1000,
    `지갑 라이트닝 잔액은 최소 1000sats 이상 필요합니다.`,
  )

  assert(
    bankAccount.split('/').length === 3,
    `입금계좌번호는 다음과 같이 슬래시(/)로 구분하여 입력합니다.\nex) 케이뱅크/1234-12-321234/*석*`,
  )

  assert(contact, `연락처 정보가 누락되었습니다`)

  // assert(
  //   contact.startsWith('https://open.kakao.com'),
  //   `오픈카톡주소 링크가 유효하지 않습니다`,
  // )
}

export const generateBlinkInvoice = async ({ memo, amount, apiKey }) => {
  assert(apiKey, `BLINK_API_KEY is undefined`)

  const { id: recipientWalletId } = await getWalletInfo(apiKey)
  const result = await reqGraphql({
    apiKey,
    query: gql`
      mutation LnInvoiceCreateOnBehalfOfRecipient(
        $input: LnInvoiceCreateOnBehalfOfRecipientInput!
      ) {
        lnInvoiceCreateOnBehalfOfRecipient(input: $input) {
          invoice {
            paymentRequest
            paymentHash
            paymentSecret
            satoshis
          }
          errors {
            message
          }
        }
      }
    `,
    variables: {
      input: {
        amount,
        expiresIn: 10, // 10m
        memo,
        recipientWalletId,
      },
    },
  })

  if (result.data.lnInvoiceCreateOnBehalfOfRecipient.errors.length > 0) {
    throw Error(JSON.stringify(result.errors))
  }

  return result.data.lnInvoiceCreateOnBehalfOfRecipient.invoice
}

export const serializeSeller = async (seller: Seller) => {
  const btcPrice = await getBtcPrice()
  const balance = await _getSatsBalance(seller.apiKey)
  const withdrawLimit = await getWithdrawLimit(balance)

  const mmdd = dayjsKo().format('MMDD')
  return `이름: ${nameEmoji(seller)}
프리미엄: ${seller.premium} %
계좌번호: ${seller.bankAccount}

판매자등록: ${dateFormat(seller.createdAt, 'M월 D일')}
숨김처리: ${seller.hidden ? 'ON 🙈' : 'OFF 👀'}

지갑잔액: ${balance.satsBalance.toLocaleString()} sats (${satsToWon(
    balance.satsBalance,
    btcPrice,
  ).toLocaleString()} 원)
출금한도: ${withdrawLimit.toLocaleString()} sats (${satsToWon(
    withdrawLimit,
    btcPrice,
  ).toLocaleString()} 원)

마지막거래: ${
    seller.lastTradeAt ? dayjsKo(seller.lastTradeAt).fromNow() : '없음'
  }
누적거래: ${manUint(seller.tradeAcc.krw, false)}원 ${manUint(
    seller.tradeAcc.sats,
    false,
  )}sats ${seller.tradeAcc.count.toLocaleString()}회

오늘거래: ${todayAccInfo(seller)}
 - 오전: ${todayAccInfo(seller, '오전')}
 - 오후: ${todayAccInfo(seller, '오후')}

Pushbullet 연동: ${seller.pushBulletKey && seller.enabled ? '✅' : '❌'}${
    seller.enabled ? '' : '\n알림 연동 인증문자:' + seller.authMemo
  }
연락처: ${seller.contact}`
}

export const todayAccInfo = (
  seller: Seller,
  half?: string,
  satsRender: boolean = true,
) => {
  const mmdd = dayjsKo().format('MMDD')
  const when = half ?? mmdd
  return `${
    seller.todayAcc[mmdd]
      ? manUint(seller.todayAcc[when].krw, false) + '원'
      : '0원'
  } ${
    satsRender
      ? seller.todayAcc[mmdd]
        ? manUint(seller.todayAcc[when].sats, false) + 'sats'
        : '0sats'
      : ''
  } ${seller.todayAcc[mmdd] ? seller.todayAcc[when].count + '회' : '0회'}`
}

export const serializeSellerPublic = async (seller: Seller) => {
  const balance = await _getSatsBalance(seller.apiKey)
  const btcPrice = await getBtcPrice()
  const withdrawLimit = await getWithdrawLimit(balance)

  return `📄 판매자 정보
---
이름: ${nameEmoji(seller)}
프리미엄: ${seller.premium} %

지갑잔액: ${balance.satsBalance.toLocaleString()} sats (${satsToWon(
    balance.satsBalance,
    btcPrice,
  ).toLocaleString()} 원)
출금한도: ${withdrawLimit.toLocaleString()} sats (${satsToWon(
    withdrawLimit,
    btcPrice,
  ).toLocaleString()} 원)

입금계좌: ${seller.bankAccount.split('/')[0]}
마지막거래: ${
    seller.lastTradeAt ? dayjsKo(seller.lastTradeAt).fromNow() : '없음'
  }

Pushbullet 연동: ${seller.pushBulletKey && seller.enabled ? '✅' : '❌'}
연락처: ${seller.contact}`
}

export const serializeBuyer = (
  { lnAddress, createdAt, updatedAt, tradeAcc, todayAcc, from }: Buyer,
  btcPrice: number,
) => {
  const mmdd = dayjsKo().format('MMDD')

  const { avgBtcPrice, profit, ror } = getRor(btcPrice, tradeAcc)

  return `등록일: ${dateFormat(createdAt, 'M월 D일')}
텔레계정: ${from ? username(from) : '-'}
입금주소: ${lnAddress}

오늘거래: ${manUint(todayAcc?.[mmdd]?.krw ?? 0, false)}원 ${manUint(
    todayAcc?.[mmdd]?.sats ?? 0,
    false,
  )}sats ${todayAcc?.[mmdd]?.count ?? 0}회
마지막거래: ${updatedAt ? dayjsKo(updatedAt).fromNow() : '없음'}

구매금액: ${manUint(tradeAcc.krw)}원
구매수량: ${manUint(tradeAcc.sats)}sats
구매회수: ${tradeAcc.count.toLocaleString()}회

구매평균: ${avgBtcPrice}원
평가손익: ${profit}원
수익률: ${ror}%`
}

export const checkDeposit = ({ message, amountKrw, authMemo }) => {
  if (
    message.push.application_name === '텔레그램' ||
    message.push.package_name === 'org.telegram.messenger'
  ) {
    return false
  }

  const totalMessage = message.push.title + message.push.body

  return (
    totalMessage.includes('입금') &&
    (totalMessage.includes(amountKrw.toLocaleString() + '원') ||
      totalMessage.includes(amountKrw.toLocaleString() + ' 원')) &&
    totalMessage.includes(authMemo)
  )
}

export const enableSeller = async (message, seller: Seller) => {
  if (
    !checkDeposit({
      message,
      amountKrw: SELLER_JOIN_KRW,
      authMemo: seller.authMemo,
    })
  ) {
    return
  }
  const sellers = getSellers()
  const idx = sellers.findIndex(propEq(seller.chatId, 'chatId'))

  if (idx < 0) {
    notiLog(`[enableSeller] Not found seller[${seller.chatId}]`)
    return
  }

  setSellers(evolve({ [idx]: assoc('enabled', true) }))
  const msg = `[${seller.name}] Pushbullet 연동 완료 ✅`

  notiLog(msg)
  sendMsg(seller.chatId, msg)
}

interface GetAmountSats {
  amountKrw: number
  btcPrice: number
  premium: number
}

export const getAmountSats = ({
  amountKrw,
  btcPrice,
  premium,
}: GetAmountSats) => {
  const fullSats = wonToSats(amountKrw, btcPrice)
  const feeSats = Math.ceil((fullSats * premium) / 100)
  const amountSats = fullSats - feeSats
  return {
    fullSats,
    feeSats,
    amountSats,
  }
}

interface GetTxFee {
  amountSats: number
  satsBalance: number
  premium: number
}

export const getTxFee = ({ amountSats, satsBalance, premium }: GetTxFee) => {
  const txFeeRate =
    Math.round(
      (Math.max(TRADE_FEE_MIN, premium * TRADE_FEE) +
        (Math.ceil(satsBalance / TRADE_FEE_INC_UNIT) - 1) * TRADE_FEE_ALPHA) *
        100,
    ) / 10000

  return {
    txFee: Math.ceil(amountSats * txFeeRate),
    txFeeRate: Math.floor(txFeeRate * 100 * 100) / 100,
  }
}

export const getPaymentInvoice = async ({ lnAddress, amountSats, memo }) => {
  logger.verbose(`[Before invoice creation] ${memo}`)

  const callback = await getLnurlCallback(lnAddress)
  const { pr } = await req.get(callback, {
    amount: amountSats * 1000,
  })

  notiLog(
    `[Invoice created ✅] ${memo} - ${dayjsKo().format(
      'M/D HH:mm:ss:SSS',
    )}\n${pr}`,
  )
  return pr
}

export const lnAddressInfo = async lnaddress => {
  const [id, host] = lnaddress.split('@')
  const result = await req
    .get(`https://${host}/.well-known/lnurlp/${id}`)
    .catch(e => ({ status: 'ERROR', reason: e.message }))
  return result
}

export const getLnurlCallback = async lnaddress => {
  const [id, host] = lnaddress.split('@')
  if (host === 'strike.me') {
    return `https://strike.me/api/lnurlp/${id}/`
  }
  const result = await req.get(`https://${host}/.well-known/lnurlp/${id}`)
  return result.callback
}

interface SendSatsBlinkLnAddress {
  blinkApiKey: string
  walletId: string
  amountSats: number
  lnAddress: string
}

export const sendSatsBlnikLnAddress = async ({
  blinkApiKey,
  walletId,
  amountSats,
  lnAddress,
}: SendSatsBlinkLnAddress) => {
  /**
   * 라이트닝 출금 주소가 판매자 본인 지갑일 경우 아래와 같은 오류 발생
sendSatsResult.lnAddressPaymentSend {
  status: 'FAILURE',
  errors: [
    {
      code: 'CANT_PAY_SELF',
      message: 'User tried to pay themselves',
      path: null
    }
  ]
}
   * 하지만 어짜피 다른 오류 유형과 마찬가지로 예외처리가 될 것이므로 특별한 예외처리를 하지는 않는다.
   */
  const result = await reqGraphql({
    apiKey: blinkApiKey,
    query: gql`
      mutation LnAddressPaymentSend($input: LnAddressPaymentSendInput!) {
        lnAddressPaymentSend(input: $input) {
          status
          errors {
            code
            message
            path
          }
        }
      }
    `,
    variables: {
      input: {
        walletId,
        amount: amountSats,
        lnAddress,
      },
    },
  })
  return result.data
}

export const createQuote = async ({ lnAddress, amountSats, memo, apiKey }) => {
  // logger.verbose(
  //   `[Before quote creation] ${memo} - ${dayjsKo().format('M/D HH:mm:ss:SSS')}`,
  // )
  const result = await req.post(
    `https://api.strike.me/v1/payment-quotes/lightning/lnurl`,
    {
      lnAddressOrUrl: lnAddress,
      sourceCurrency: 'BTC',
      amount: {
        amount: String(amountSats / 100000000),
        currency: 'BTC',
      },
      description: lnAddress.endsWith('@blink.sv') ? undefined : memo,
    },
    {
      headers: {
        Authorization: `Bearer ${getStrikeApiKey(apiKey)}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  )
  assert(result.paymentQuoteId, `[Strike] Quote creation error.`)
  notiLog(
    `[Quote created ✅] ${memo} - ${dayjsKo().format('M/D HH:mm:ss:SSS')}\n${
      result.paymentQuoteId
    }`,
  )
  return result
}

export const sendSatsLnAddress = async ({ apiKey, trade, lnAddress, memo }) => {
  const decApiKey = getDecApiKey(apiKey)

  if (decApiKey.startsWith('blink_')) {
    const result = await sendSatsBlink({
      blinkApiKey: decApiKey,
      paymentLnInvoice:
        lnAddress === ADMIN_ADDRESS
          ? trade?.paymentFeeLnInvoice
          : trade?.paymentLnInvoice,
      memo,
    })

    logger.verbose(`blink result: [${JSON.stringify(result)}]`)

    if (result.lnInvoicePaymentSend?.status !== 'SUCCESS') {
      if (
        result.lnInvoicePaymentSend?.status === 'ALREADY_PAID' ||
        result.lnInvoicePaymentSend?.errors?.[0]?.message ===
          'Invoice is already paid'
      ) {
        notiLog(
          `[sendBlink] Invoice is already paid ${
            trade.authMemo
          } ${JSON.stringify(result)}`,
        )
      } else {
        throw Error(
          `❌ [sendBlinkErr] ${trade.authMemo} ${JSON.stringify(result)}`,
        )
      }
    }

    return result
  } else {
    const result = await sendSatsStrike({
      apiKey: decApiKey,
      paymentQuoteId: trade?.paymentQuoteId,
    })
    /**
{
  paymentId: '7dc8ff31-521b-4c98-9f49-ed5b11712531',
  state: 'COMPLETED',
  result: 'SUCCESS',
  completed: '2024-03-05T12:11:12.6021364+00:00',
  delivered: '2024-03-05T12:11:12.6021364+00:00',
  amount: { amount: '0.00000001', currency: 'BTC' },
  totalAmount: { amount: '0.00000001', currency: 'BTC' }
}

{
  "traceId": "0HN3OK1EOO8RM:00000002",
  "data": {
    "status": 422,
    "code": "INVALID_STATE_FOR_INVOICE_PAID",
    "message": "Invoice has already been paid."
  }
}

// 2024년 7월 19일 확인 (중복출금 메세지가 변경되었나 봄)
{
  "traceId":"0HN576T0HOK51:00000001",
  "data": {
    "status":422,
    "code":"PAYMENT_PROCESSED",
    "message":"Payment was already processed.",
    "values":{"paymentId":"c1416b60-1095-467f-ba5b-69386808f771"}
  }
}


// 2024년 8월 15일 펜딩 결과를 받아서 성공으로 처리했었당;
    {
      paymentId: '5b29731d-278b-4f09-955c-68349e46bc9e',
      state: 'PENDING',
      result: 'PENDING',
      amount: {
        amount: '0.00059321',
        currency: 'BTC',
      },
      totalFee: {
        amount: '0.00000002',
        currency: 'BTC',
      },
      lightningNetworkFee: {
        amount: '0.00000002',
        currency: 'BTC',
      },
      totalAmount: {
        amount: '0.00059323',
        currency: 'BTC',
      },
    }
     */

    if (result.state !== 'COMPLETED') {
      if (
        result.data?.code === 'INVALID_STATE_FOR_INVOICE_PAID'
        // ||result.data?.code === 'PAYMENT_PROCESSED'
      ) {
        notiLog(
          `[sendStrike] already processed ${trade.authMemo} - ${
            trade.sellerName
          } ${JSON.stringify(result)}`,
        )
      } else {
        throw Error(
          `[sendStrikeErr] ❌ ${trade.authMemo} ${JSON.stringify(result)}`,
        )
      }
    }

    return result
  }
}

export const checkPayment = async (
  message,
  seller: Seller,
  confirmed?: boolean,
) => {
  const trades: Trade[] = getTrades()

  const idx = trades.findIndex(
    item =>
      item.sellerChatId === seller.chatId &&
      checkDeposit({
        message,
        amountKrw: item.amountKrw,
        authMemo: item.authMemo,
      }) &&
      (Date.now() < item.expiredAt + WATING_NOTI_TIME * MINUTE || confirmed),
  )

  if (idx < 0) {
    return
  }
  let trade
  if (!trades[idx].krwPaidAt) {
    trade = assoc('krwPaidAt', Date.now(), trades[idx])
    setTrades(evolve({ [idx]: always(trade) }))

    const buyers: Buyer[] = getBuyers()
    const buyerIdx = buyers.findIndex(item => item.chatId === trade.buyerChatId)
    const asisBuyer = buyers[buyerIdx]
    const mmdd = dayjsKo().format('MMDD')
    const buyer = {
      ...asisBuyer,
      updatedAt: Date.now(),
      tradeAcc: {
        krw: (asisBuyer.tradeAcc?.krw ?? 0) + trade.amountKrw,
        sats: (asisBuyer.tradeAcc?.sats ?? 0) + trade.amountSats,
        count: (asisBuyer.tradeAcc?.count ?? 0) + 1,
      },
      todayAcc: {
        [mmdd]: {
          krw: (asisBuyer.todayAcc?.[mmdd]?.krw ?? 0) + trade.amountKrw,
          sats: (asisBuyer.todayAcc?.[mmdd]?.sats ?? 0) + trade.amountSats,
          premium: (asisBuyer.todayAcc?.[mmdd]?.premium ?? 0) + trade.premium,
          btcPrice:
            (asisBuyer.todayAcc?.[mmdd]?.btcPrice ?? 0) + trade.btcPrice,
          count: (asisBuyer.todayAcc?.[mmdd]?.count ?? 0) + 1,
        },
      },
    }
    setBuyers(update(buyerIdx, buyer))

    const msg = `[${
      trade.sellerName + trade.authMemo
    }] ✅ 원화 입금 완료 ${trade.amountKrw.toLocaleString()} 원`

    sendMsg(trade.buyerChatId, msg)
    sendMsg(trade.sellerChatId, msg)
    notiAdmin(msg)
  }

  await withdrawSats(trade ?? trades[idx], seller)
}

export const withdrawSats = async (
  trade: Trade,
  seller: Seller,
  confirmSatsSended = false,
) => {
  assert(
    confirmSatsSended || trade.krwPaidAt,
    `krwPaidAt is undefined [${JSON.stringify(trade)}]`,
  )
  const meta = `${trade.sellerName} ${trade.amountKrw.toLocaleString()}원 [${
    trade.authMemo
  }]`

  const tradeSummary = tradeTldr(trade, { status: false, feeInfo: false })

  if (!trade.satsSended) {
    logger.verbose(
      `<b>[before sendSatsLnAddress ⚡]</b>\n${meta} ${dayjsKo().format(
        'M/D HH:mm:ss:SSS',
      )}`,
      {
        parse_mode: 'HTML',
      },
    )

    const result = confirmSatsSended
      ? { state: 'COMPLETED' }
      : await sendSats({ seller, trade, tradeSummary })

    updateTrade(
      trade.id,
      evolve({ satsSended: T, updatedAt: always(Date.now()) }),
    )

    // logger.verbose(`sendSats result: [${JSON.stringify(result)}]`)

    if (
      result.data?.code === 'INVALID_STATE_FOR_INVOICE_PAID' ||
      // result.data?.code === 'PAYMENT_PROCESSED' ||
      result.lnInvoicePaymentSend?.status === 'ALREADY_PAID' ||
      result.lnInvoicePaymentSend?.errors?.[0]?.message ===
        'Invoice is already paid'
    ) {
      const msg = `[${
        trade.sellerName + trade.authMemo
      }] 🎊 이미 출금 처리가 완료된 건입니다(중복출금시도)`
      sendMsg(trade.buyerChatId, msg)
      sendMsg(trade.sellerChatId, msg)
      notiAdmin(msg)
      return
    }

    assert(
      result.lnInvoicePaymentSend?.status === 'SUCCESS' ||
        result.state === 'COMPLETED',
      `Invalid success message: ${JSON.stringify(result)}`,
    )

    const [mmdd, half] = dayjsKo().format('MMDD-a').split('-')

    updateSeller(
      trade.sellerChatId,
      evolve({
        tradeAcc: {
          krw: add(trade.amountKrw),
          count: inc,
          sats: add(trade.amountSats),
        },
        todayAcc: ifElse(
          prop(mmdd),
          evolve({
            [mmdd]: {
              krw: add(trade.amountKrw),
              sats: add(trade.amountSats),
              premium: add(trade.premium),
              btcPrice: add(trade.btcPrice),
              count: inc,
            },
            [half]: {
              krw: add(trade.amountKrw),
              sats: add(trade.amountSats),
              premium: add(trade.premium),
              btcPrice: add(trade.btcPrice),
              count: inc,
            },
          }),
          always({
            [mmdd]: {
              krw: trade.amountKrw,
              sats: trade.amountSats,
              premium: trade.premium,
              btcPrice: trade.btcPrice,
              count: 1,
            },
            [half]: {
              krw: trade.amountKrw,
              sats: trade.amountSats,
              premium: trade.premium,
              btcPrice: trade.btcPrice,
              count: 1,
            },
            [half === '오전' ? '오후' : '오전']: {
              krw: 0,
              sats: 0,
              premium: 0,
              btcPrice: 0,
              count: 0,
            },
          }),
        ),
        updatedAt: always(Date.now()),
        lastTradeAt: always(Date.now()),
      }),
    )

    notiLog(
      `<b>[sendSats ⚡] success ✅</b>\n${tradeSummary} ${dayjsKo().format(
        'M/D HH:mm:ss:SSS',
      )}`,
      {
        parse_mode: 'HTML',
        level: 'off',
      },
    )

    const prefix = `[${trade.sellerName + trade.authMemo}]`

    const msg = `${prefix} ✅ 라이트닝 전송 완료 ${trade.amountSats.toLocaleString()} sats`

    sendMsg(
      trade.buyerChatId,
      confirmSatsSended
        ? `${prefix} 🙋 판매자가 ${trade.amountSats.toLocaleString()}sats 전송을 완료했습니다. 비트코인이 잘 입금되었는 지 확인해 보세요.`
        : msg,
    )
    sendMsg(
      trade.sellerChatId,
      confirmSatsSended
        ? `${prefix} 🙋 구매자에게 ${trade.amountSats.toLocaleString()}sats 비트코인이 잘 전송되었는 지 확인해 보세요.`
        : msg,
    )

    notiAdmin(
      confirmSatsSended
        ? `${prefix} 🙋 판매자가 ${trade.amountSats.toLocaleString()}sats 전송을 확인하였습니다.`
        : msg,
    )
  }

  if (!trade.txFeePaid) {
    await payTradeFee({
      seller,
      trade,
      satsBalance: trade.sellerSatsBalance,
      tradeSummary,
    })
  }

  setTimeout(async () => {
    try {
      // 거래 내역 갱신되는데 시간이 조금 필요하기 때문에 3초 후 거래 완료 노티
      const _trade = findTrade(trade.id)
      if (!_trade) {
        logger.warn(`_trade is not found`)
        return
      }

      if (_trade.satsSended && _trade.txFeePaid) {
        sendMsg(CHAT_ID.history, tradeTldr(_trade))

        setTrades(reject(propEq(_trade.id, 'id')))

        const btcPrice = await getBtcPrice()
        const balance = await getSatsBalance(seller.apiKey)
        const balMsg = `${
          _trade.sellerName
        }지갑잔액⚡️ ${balance.satsBalance.toLocaleString()} sats (${satsToWon(
          balance.satsBalance,
          btcPrice,
        ).toLocaleString()} 원)`
        sendMsg(_trade.sellerChatId, balMsg)
      }
    } catch (err: any) {
      notiLog(`[withdrawSats-setTimeout] ${err.message}`, { level: 'error' })
    }
  }, 3000)
}

export const fetchBtcPrice = (): Promise<number> =>
  req
    .get(`https://api.upbit.com/v1/candles/days`, {
      market: 'KRW-BTC',
      count: 1,
    })
    .then(res => res[0]['trade_price'])

export const fetchBtcPriceBithumb = async (): Promise<number> => {
  const result = await fetch(
    'https://api.bithumb.com/v1/ticker?markets=KRW-BTC',
    {
      method: 'GET',
      headers: { accept: 'application/json' },
    },
  ).then(response => response.json())

  const price = result[0].trade_price
  return price
}

export const getBtcPrice = sequentialInvoke<number>(
  fnWithCache<number>(
    BASED_ON_UPBIT
      ? function btcPriceUpbit() {
          return fetchBtcPrice()
        }
      : function btcPriceBithumb() {
          return fetchBtcPriceBithumb()
        },
    3000,
  ),
)

export const serializeTrade = (trade: Trade) => {
  return `👥 거래 정보 ---
거래아이디: ${trade.id}
거래생성시각: ${dateFormat(trade.createdAt)}

비트코인 시세: ${trade.btcPrice.toLocaleString()} 원(${
    BASED_ON_UPBIT ? '업비트' : '빗썸'
  })
구매금액: ${trade.amountKrw.toLocaleString()} 원 (${trade.fullSats.toLocaleString()} sats)

판매자: ${trade.sellerName}
판매자 프리미엄: ${trade.premium} %
수수료: ${trade.feeSats.toLocaleString()} sats (${trade.fullSats.toLocaleString()} sats x ${
    trade.premium
  } %)

예상수령액: ${trade.amountSats.toLocaleString()} sats (${trade.fullSats.toLocaleString()} - ${trade.feeSats.toLocaleString()})
입금주소: ${trade.lnAddress}


💰 원화 입금 정보 ---
계좌번호: ${trade.bankAccount}
송금금액: ${trade.amountKrw.toLocaleString()} 원
입금자명: ${trade.authMemo}
입금대기 만료: ${dateFormat(trade.expiredAt)}`
}

interface PayTradeFee {
  seller: Seller
  trade: Trade
  tradeSummary: string
  satsBalance: number
}

const payTradeFee = async ({
  seller,
  trade,
  tradeSummary,
  satsBalance,
}: PayTradeFee) => {
  const { txFee, txFeeRate } = getTxFee({
    amountSats: wonToSats(trade.amountKrw, trade.btcPrice),
    satsBalance,
    premium: trade.premium,
  })
  const feeInfo = `${txFee}sats / ${txFeeRate}% / ${satsBalance.toLocaleString()}sats ${tradeSummary} ${dayjsKo().format(
    'M/D HH:mm:ss:SSS',
  )}`

  assert(txFee > 0, `txFee is invalid: ${txFee}`)

  const result = await sendSatsLnAddress({
    apiKey: seller.apiKey,
    trade,
    lnAddress: ADMIN_ADDRESS,
    memo: `[Txfee] ${feeInfo}`,
  }).catch(err => {
    notiLog(`[payFee 💰] error ❌: ${err.message}\n${feeInfo}`, {
      level: 'error',
    })
    throw Error(err)
  })

  logger.info(`[TxFee paid] ${feeInfo}`)

  updateTrade(trade.id, evolve({ txFeePaid: T, updatedAt: always(Date.now()) }))

  // logger.verbose(`sendSatsLnAddress result: [${JSON.stringify(result)}]`)

  if (
    result.data?.code === 'INVALID_STATE_FOR_INVOICE_PAID' ||
    // result.data?.code === 'PAYMENT_PROCESSED' ||
    result.lnInvoicePaymentSend?.status === 'ALREADY_PAID' ||
    result.lnInvoicePaymentSend?.errors?.[0]?.message ===
      'Invoice is already paid'
  ) {
    notiAdmin(
      `[payFee][${
        trade.authMemo + ' - ' + trade.sellerName
      }] 💰 이미 수수료 납입 처리가 완료된 건입니다(중복출금시도)`,
    )
    return
  }
  notiLog(`<b>[payFee 💰] success ✅</b>\n${feeInfo}`, {
    parse_mode: 'HTML',
    level: 'off',
  })

  notiAdmin(
    `[${
      trade.sellerName + trade.authMemo
    }] ✅ 수수료 납입 완료 ${trade.txFee.toLocaleString()} sats`,
  )
}

interface SendSats {
  seller: Seller
  trade: Trade
  tradeSummary: string
}

export const sendSats = ({ seller, trade, tradeSummary }: SendSats) =>
  sendSatsLnAddress({
    apiKey: seller.apiKey,
    lnAddress: trade.lnAddress,
    memo: `${trade.id} ${tradeSummary} ${dayjsKo().format('M/D HH:mm:ss:SSS')}`,
    trade,
  }).catch(async err => {
    notiLog(
      `<b>[sendSats ⚡] ${
        err.message
      } ❌</b>\n${tradeSummary} ${dayjsKo().format('M/D HH:mm:ss:SSS')}`,
      {
        parse_mode: 'HTML',
        level: 'error',
      },
    )
    throw err
  })

export const tradeStatus = (trade: Trade) =>
  oneOf([
    [!trade.krwPaidAt && Date.now() < trade.expiredAt, '⏳신규거래'],
    [!!trade.krwPaidAt && !trade.satsSended, '❌라이트닝전송실패'],
    [
      !!trade.krwPaidAt && trade.satsSended && !trade.txFeePaid,
      '❌거래수수료미납',
    ],
    [!!trade.krwPaidAt && trade.satsSended && trade.txFeePaid, '✅거래완료'],
    [
      !trade.krwPaidAt && trade.expiredAt < Date.now(),
      `⏰원화미입금만료(${dayjsKo(trade.expiredAt).fromNow()}${
        after3days(trade) ? '🗑️' : ''
      })`,
    ],
  ]) ?? 'N/A'

export const getSellerList = async (): Promise<SellerWithBalance[]> => {
  const list = filter(
    item =>
      !item.hidden &&
      item.enabled &&
      krwRecvLimit(item) >= SELLER_WALLET_MIN_KRW,
  )(getSellers())

  const [btcPrice, wonDollarRate, balances] = await Promise.all([
    getBtcPrice(),
    getWonDollarRate(),
    Promise.all(list.map(item => getSatsBalance(item.apiKey))),
  ])

  const tradesMap: Record<string, Trade[]> = compose(
    groupBy(prop('sellerChatId')),
    filter(item => !item.satsSended),
  )(getTrades())

  const now = Date.now()

  const sellerBalList = list.map((seller: Seller, idx) => ({
    ...seller,
    balance: balances[idx],
    maxKrw: tradeMaxAmountKrw({
      satsBalance: balances[idx].satsBalance,
      remainingLimit: balances[idx].remainingLimit,
      available: balances[idx].available,
      btcPrice,
      wonDollarRate,
      seller,
    }),
    satsNotSended: tradesMap[seller.chatId] ?? [],
    tradesExpired: (tradesMap[seller.chatId] ?? []).filter(
      item => item.expiredAt <= now,
    ),
    tradesInProgress: (tradesMap[seller.chatId] ?? []).filter(
      item => now < item.expiredAt,
    ),
  }))

  logger.verbose(
    '라이트닝잔액 이름\n' +
      sellerBalList
        .map(
          seller =>
            `${seller.balance.satsBalance
              .toLocaleString()
              .padStart(14, ' ')} sats ${seller.name}`,
        )
        .join('\n'),
  )

  // console.log('sellerBalList', sellerBalList)

  return compose(
    sort(sellersOrder),
    filter(
      (seller: SellerWithBalance) =>
        seller.balance.satsBalance >= SELLER_WALLET_MIN_BALANCE &&
        seller.maxKrw >= SELLER_WALLET_MIN_KRW,
    ),
  )(sellerBalList)
}

export const sellersOrder = (a: SellerWithBalance, b: SellerWithBalance) => {
  if (a.tradesExpired.length !== b.tradesExpired.length) {
    // 0. 미정산 거래개수 오름차순
    return a.tradesExpired.length - b.tradesExpired.length
  }

  if (a.tradesInProgress.length !== b.tradesInProgress.length) {
    // 1. 진행중인 거래개수 오름차순
    return a.tradesInProgress.length - b.tradesInProgress.length
  }

  if (a.premium !== b.premium) {
    // 2. 프리미엄 오름차순
    return a.premium - b.premium
  }

  const [mmdd, half] = dayjsKo().format('MMDD-a').split('-')

  if (
    halfKrw(a.todayAcc, { mmdd, half }) !== halfKrw(b.todayAcc, { mmdd, half })
  ) {
    // 3. seller.todayAcc[half].krw 오름차순
    return (
      halfKrw(a.todayAcc, { mmdd, half }) - halfKrw(b.todayAcc, { mmdd, half })
    )
  }

  if ((a.todayAcc[mmdd]?.krw ?? 0) !== (b.todayAcc[mmdd]?.krw ?? 0)) {
    // 4. 오늘 판매량 낮은 순
    return (a.todayAcc[mmdd]?.krw ?? 0) - (b.todayAcc[mmdd]?.krw ?? 0)
  }

  // 5. 등록일 빠른 순
  return a.createdAt - b.createdAt
}

const halfKrw = (todayAcc, { mmdd, half }): number => {
  assert(todayAcc, `todayAcc is falsy`)
  if (!todayAcc[mmdd]) {
    return 0
  }
  if (!todayAcc[half]) {
    return 0
  }
  return todayAcc[half].krw
}

export const getListMessage = async () => {
  const list = await getSellerList()
  // console.log('getSellerList', list)
  const now = Date.now()

  const sellerList = list.map(item => ({
    ...item,
    selling: item.tradesInProgress.reduce(
      (acc, item) => ({
        count: acc.count + 1,
        accKrw: acc.accKrw + item.amountKrw,
        accSats: acc.accSats + item.amountSats,
      }),
      { count: 0, accKrw: 0, accSats: 0 },
    ),
    expired: item.tradesExpired.reduce(
      (acc, item) => ({
        count: acc.count + 1,
        accKrw: acc.accKrw + item.amountKrw,
        accSats: acc.accSats + item.amountSats,
      }),
      { count: 0, accKrw: 0, accSats: 0 },
    ),
  }))

  const sellerListMsg = sellerList
    .map(
      (
        {
          name,
          premium,
          balance,
          maxKrw,
          selling,
          expired,
          pushBulletKey,
        }: any,
        idx,
      ) =>
        `${idx + 1}. ${nameEmoji({
          name,
          pushBulletKey,
        } as Seller)}  ${premium}%  ${manUint(
          balance.satsBalance,
          false,
          500_000,
        )}sats  ${manUint(maxKrw, false, 500_000)}원${
          selling.count > 0
            ? `\n   (진행 중인 거래: ${selling.accKrw.toLocaleString()}원 / ${
                selling.count
              }건)`
            : ''
        }${
          expired.count > 0
            ? `\n   (미정산 거래: ${expired.accKrw.toLocaleString()}원 / ${
                expired.count
              }건)`
            : ''
        }`,
    )
    .join('\n')

  // logger.verbose(
  //   list.length > 0
  //     ? `No. 이름 - 프리미엄 - 라이트닝잔액 - 구매가능\n${sellerList
  //         .map(
  //           ({ name, premium, balance, maxKrw, selling, expired }: any, idx) =>
  //             `${
  //               idx + 1
  //             }. ${name} - ${premium} - ${balance.satsBalance.toLocaleString()} - ${maxKrw.toLocaleString()}  ${
  //               selling.count > 0
  //                 ? `\n   (진행 중인 거래: ${selling.accKrw.toLocaleString()}원 / ${
  //                     selling.count
  //                   }건)`
  //                 : ''
  //             }${
  //               expired.count > 0
  //                 ? `\n   (미정산 거래: ${expired.accKrw.toLocaleString()}원 / ${
  //                     expired.count
  //                   }건)`
  //                 : ''
  //             }`,
  //         )
  //         .join('\n')}`
  //     : '등록된 판매자가 없습니다.',
  // )

  return list.length > 0
    ? `<i>No. 이름  프리미엄  라이트닝잔액  구매가능</i>\n---\n${sellerListMsg}`
    : 'No sellers are available'
}

interface TradeTldr {
  status?: boolean
  feeInfo?: boolean
  pDetail?: boolean
}
export const tradeTldr = (trade: Trade, option?: TradeTldr) => {
  const status = option?.status ?? true
  const feeInfo = option?.feeInfo ?? true
  const pDetail = option?.pDetail ?? false

  const feeInfoStr = ` [ ${trade.txFee}sats ${
    trade.txFeeRate
  }% ${trade.sellerSatsBalance.toLocaleString()}sats ]`

  const sellerFeeSats = trade.fullSats - trade.amountSats

  const premiumDetail = `(${satsToWon(
    sellerFeeSats,
    trade.btcPrice,
  ).toLocaleString()}원/${sellerFeeSats.toLocaleString()}sats)`

  return `[${trade.sellerName + trade.authMemo}]${
    status ? ' ' + tradeStatus(trade) : ''
  } ${trade.amountKrw.toLocaleString()}원 ${trade.amountSats.toLocaleString()}sats ${
    trade.premium
  }%${pDetail ? premiumDetail : ''} ${exchangePriceInfo({
    btcPrice: trade.btcPrice,
    btcPriceBinance: trade.btcPriceBinance,
    krwusd: trade.krwusd,
  })} ${trade.lnAddress} ${trade.id} ${dateFormat(trade.createdAt)} ${
    feeInfo ? feeInfoStr : ''
  }`
}

export const exchangePriceInfo = ({ btcPrice, btcPriceBinance, krwusd }) => {
  const kimp = getKimp({
    btcPrice,
    krwusd,
    btcPriceBinance,
  })

  return `(${(btcPrice / 1000).toLocaleString()}천원 ${Math.floor(
    btcPriceBinance,
  ).toLocaleString()}달러 ${krwusd.toLocaleString()}원 ${
    kimp > 0 ? '+' : ''
  }${kimp}%)`
}

export const notPaidTradeTldr = (trade: Trade) =>
  `[${trade.sellerName + trade.authMemo}] ${tradeStatus(
    trade,
  )} [ ${trade.amountKrw.toLocaleString()}원 ${trade.amountSats.toLocaleString()}sats ${dateFormat(
    trade.createdAt,
    'HH:mm:ss M/D',
  )} ]\n원화 입금 확인되어 라이트닝 전송⚡️ /confirmkrw_${trade.id}\nor\n${
    !!trade.krwPaidAt && !trade.satsSended
      ? '비트코인 전송을 완료했다면 클릭✅ /confirmsatssended_' + trade.id
      : '원화 미입금으로 해당 거래 삭제🗑️ /deletetradenotpaid_' + trade.id
  }`

export const krwRecvLimit = (seller: Seller) => {
  const mmdd = dayjsKo().format('MMDD')
  if (!seller.todayAcc[mmdd]) {
    return SELLER_TODAY_ACC_AMOUNT_KRW_LIMIT
  }
  return SELLER_TODAY_ACC_AMOUNT_KRW_LIMIT - seller.todayAcc[mmdd].krw
}

export const getWonDollarRate = sequentialInvoke<number>(
  fnWithCache(async function wonDollarRate() {
    const res = await Promise.any([
      krwusdWoori(),
      krwusdHana(),
      krwusdNaver(),
      krwusdShinhan(),
      krwusdKb(),
    ])
    return Number(res.replaceAll(',', ''))
  }, 10_000),
)

export const tradeMaxAmountKrw = ({
  satsBalance,
  btcPrice,
  remainingLimit,
  available,
  wonDollarRate,
  seller,
}) => {
  assert(
    (validNumber(remainingLimit) && available === undefined) ||
      (remainingLimit === undefined && validNumber(available)),
    `remainingLimit 또는 available 둘 중 하나만 세팅되어야 한다. ${JSON.stringify(
      { remainingLimit, available },
    )}`,
  )
  return Math.min(
    Math.floor(satsToWon(satsBalance, btcPrice) * 0.95),
    BUYER_AMOUNT_MAX,
    krwRecvLimit(seller),
    Math.floor(
      (remainingLimit
        ? remainingLimit * wonDollarRate
        : satsToWon(available!, btcPrice)) * 0.95,
    ),
  )
}

export const validNumber = num => typeof num === 'number' && !Number.isNaN(num)

export const getPriceMessage = async () => {
  const [btcPrice, wonDollarRate, btcPriceBinance] = await Promise.all([
    getBtcPrice(),
    getWonDollarRate(),
    getBtcPriceBinance(),
  ])

  const kimp = getKimp({ btcPrice, krwusd: wonDollarRate, btcPriceBinance })

  const message = `<i>${dateFormat(undefined, 'YYYY.MM.DD HH:mm:ss')}</i>
---
${BASED_ON_UPBIT ? '업비트' : '빗썸'}: ${btcPrice.toLocaleString()} 원
바이낸스: ${Math.floor(btcPriceBinance).toLocaleString()} 달러
환율: ${wonDollarRate.toLocaleString()} 원
김프: ${kimp > 0 ? '+' : ''}${kimp} %`
  return message
}

export const getPriceListMessage = async () => {
  const [infoMessage, listMessage] = await Promise.all([
    getPriceMessage(),
    getListMessage(),
  ])
  const message = `${infoMessage}\n\n${listMessage}`
  return message
}

interface SplitAndSend<T> {
  chatId: number
  list: T[]
  serialize: (item: T, idx: number, arr: T[], pageIdx: number) => string
  count?: number
  itemDelimeter?: string
}
export const splitAndSend = <T>({
  chatId,
  list,
  serialize,
  count,
  itemDelimeter,
}: SplitAndSend<T>) => {
  const len = count ?? 20
  const delimeter = itemDelimeter ?? '\n\n'

  for (let i = 0; i < list.length; i += len) {
    const message = list
      .slice(i, i + len)
      .map((item, idx, arr) => serialize(item, idx, arr, i))
      .join(delimeter)
    sendMsg(chatId, message)
  }
}

export const after3days = (item: Trade) =>
  item.expiredAt + 3 * DAY < Date.now() && !item.krwPaidAt

export const shorten = (str: string, maxLength = 12) =>
  str.length <= maxLength ? str : str.slice(0, maxLength - 1) + '..'

export const nameEmoji = (seller: Seller) =>
  `${seller.name}${seller.pushBulletKey ? '✨' : '🍎'}`

export const getRor = (btcPrice, { sats, krw }) => {
  const avgBtcPrice = (krw * BTCUNIT) / sats
  const satsKrw = Math.floor((btcPrice * sats) / BTCUNIT)
  const profit = satsKrw - krw
  const percent = (profit * 100) / krw
  const ror = krw
    ? percent < 10
      ? Math.floor(percent * 100) / 100
      : Math.floor(percent)
    : 0

  return {
    ror: ror > 0 ? '+' + ror : ror,
    profit: (profit > 0 ? '+' : '') + manUint(profit, false, 10000),
    avgBtcPrice: manUint(avgBtcPrice, false),
  }
}

export const getKimp = ({ btcPrice, krwusd, btcPriceBinance }) =>
  Math.floor((btcPrice / (btcPriceBinance * krwusd) - 1) * 10000) / 100
