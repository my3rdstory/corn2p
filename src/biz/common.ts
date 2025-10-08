import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'
import { oneOf } from 'mingutils'
import { Balance, From, Msg, Trade } from '../types'
import dayjsKo from '../utils/dayjs-ko'
import {
  assert,
  dateFormat,
  fnWithCache,
  fnWithCacheByParam,
  req,
  sequentialInvoke,
  sequentialInvokeByParam,
} from '../utils/lib'
import logger from '../utils/logger'
import { BUYER_AMOUNT_MAX, BUYER_AMOUNT_MIN, CHAT_ID } from './config'
import { BTCUNIT, WORDS } from './constants'
import { getBlinkApiKey, getDecApiKey, getStrikeApiKey } from './encrypt'
import { sendMsg } from './get-tele-bot'

export const satsToWon = (sats: number, btcPrice: number) =>
  Math.floor((sats * btcPrice) / BTCUNIT)

export const wonToSats = (won: number, btcPrice: number) =>
  Math.floor((won * BTCUNIT) / btcPrice)

export const notiLog = (message, options: any = {}) => {
  if (options.level !== 'off') {
    logger[options.level ?? 'verbose'](message)
  }
  return sendMsg(CHAT_ID.log, message, options)
}

export const notiAdmin = (message, options = {}) =>
  sendMsg(CHAT_ID.admin, message, options)

export const getStrikeBalance = async apiKey => {
  const result = await req.get('https://api.strike.me/v1/balances', undefined, {
    headers: {
      Authorization: `Bearer ${getStrikeApiKey(apiKey)}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })
  /**
오류 발생시 result 의 데이터 구조
{
  data: {
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'Invalid or unspecified identity.'
  }
} 
 */

  assert(Array.isArray(result), JSON.stringify(result.data))

  const btcWallet = result.find(item => item.currency === 'BTC')

  return {
    balance: Math.round(btcWallet.total * BTCUNIT),
    available: Math.round(btcWallet.available * BTCUNIT),
  }
}

export const genAuthMemo = () =>
  WORDS[Math.floor(Math.random() * WORDS.length)] +
  WORDS[Math.floor(Math.random() * WORDS.length)]

export interface GetSatsBalanceOutput {
  satsBalance: number
  remainingLimit?: number
  available?: number
}

export const _getSatsBalance = async (
  apiKey: string,
): Promise<GetSatsBalanceOutput> => {
  try {
    if (getDecApiKey(apiKey).startsWith('blink_')) {
      const wallet = await getWalletInfo(apiKey)

      return {
        satsBalance: wallet.balance,
        remainingLimit: wallet.remainingLimit / 100,
      }
    } else {
      const result = await getStrikeBalance(apiKey)

      return { satsBalance: result.balance, available: result.available }
    }
  } catch {
    return { satsBalance: 0, available: 0, remainingLimit: 0 }
  }
}

export const getSatsBalance = sequentialInvokeByParam<GetSatsBalanceOutput>(
  fnWithCacheByParam(function satsBal(apiKey) {
    return _getSatsBalance(apiKey)
  }, 5000),
)

export const sendSatsBlink = async ({
  blinkApiKey,
  memo,
  paymentLnInvoice,
}) => {
  assert(paymentLnInvoice, `Not found paymentLnInvoice`)

  const { id: walletId } = await getWalletInfo(blinkApiKey)
  const result = await reqGraphql({
    apiKey: blinkApiKey,
    query: gql`
      mutation LnInvoicePaymentSend($input: LnInvoicePaymentInput!) {
        lnInvoicePaymentSend(input: $input) {
          status
          errors {
            message
            path
            code
          }
        }
      }
    `,
    variables: {
      input: {
        memo,
        walletId,
        paymentRequest: paymentLnInvoice,
      },
    },
  })
  // notiLog(`LnInvoicePaymentSend: ${JSON.stringify(result.data)}`)

  // if (result.data.lnInvoicePaymentSend.errors) {
  //   console.log(result.data.lnInvoicePaymentSend.errors)
  // }
  /**

  { lnInvoicePaymentSend: { status: 'SUCCESS', errors: [] } }
  { lnInvoicePaymentSend: { status: 'ALREADY_PAID', errors: [] } }
   * 
   * 
   */
  return result.data
}

export const sendSatsStrike = ({ apiKey, paymentQuoteId }) => {
  assert(paymentQuoteId, `Not found paymentQuoteId`)

  return req
    .patch(
      `https://api.strike.me/v1/payment-quotes/${paymentQuoteId}/execute`,
      undefined,
      {
        headers: {
          Authorization: `Bearer ${getStrikeApiKey(apiKey)}`,
          Accept: 'application/json',
        },
      },
    )
    .then(res => {
      /**
Quote executed {
paymentId: '7dc8ff31-521b-4c98-9f49-ed5b11712531',
state: 'COMPLETED',
result: 'SUCCESS',
completed: '2024-03-05T12:11:12.6021364+00:00',
delivered: '2024-03-05T12:11:12.6021364+00:00',
amount: { amount: '0.00000001', currency: 'BTC' },
totalAmount: { amount: '0.00000001', currency: 'BTC' }
}
 */
      logger.verbose(
        `[Quote executed] ${paymentQuoteId}\n${Math.round(
          Number(res.totalAmount.amount) * 100000000,
        ).toLocaleString()}sats ${dayjsKo().format('M/D HH:mm:ss:SSS')}`,
      )
      return res
    })
    .catch(err => {
      /**
Quote executed  {
  traceId: '0HN3Q6NF5BFTN:00000001',
  data: {
    status: 422,
    code: 'INVALID_STATE_FOR_INVOICE_PAID',
    message: 'Invoice has already been paid.',
  },
}

중복 출금 오류 메세지
[422] {"traceId":"0HN576T0HOK51:00000001","data":{"status":422,"code":"PAYMENT_PROCESSED","message":"Payment was already processed.","values":{"paymentId":"c1416b60-1095-467f-ba5b-69386808f771"}}}

 */

      if (
        err.message.includes('Invoice has already been paid')
        // || err.message.includes('Payment was already processed')
      ) {
        // 이미 처리된 건일 경우에는 정상 동작이 되게 한다
        return JSON.parse(err.message.replace('[422] ', '')) // 파싱하기 위해 앞에 붙은 `[422] ` 문자열 제거
      }
      throw err
    })
}

export const getWalletInfo = async apiKey => {
  const result = await reqGraphql({
    apiKey,
    query: gql`
      query Me {
        me {
          defaultAccount {
            wallets {
              id
              walletCurrency
              balance
            }
            limits {
              withdrawal {
                totalLimit
                remainingLimit
                interval
              }
            }
          }
        }
      }
    `,
  })
  /**
// 에러 응답  
{
  data: { me: null },
  errors: [ { message: 'Not authorized', locations: [Array], path: [Array] } ]
}

// 정상 응답
{ data: { me: { defaultAccount: [Object] } } }
   */
  // console.log('Wallet info result', result)
  assert(result.data?.me, `${JSON.stringify(result.errors)}`)

  const wallet = result.data.me.defaultAccount.wallets.find(
    item => item.walletCurrency === 'BTC',
  )

  return {
    id: wallet.id,
    balance: wallet.balance,
    remainingLimit:
      result.data.me.defaultAccount.limits.withdrawal[0].remainingLimit,
  }
}

export const reqGraphql = async ({
  apiKey,
  query,
  variables = {},
  option = {},
}) => {
  const res = await fetch('https://api.blink.sv/graphql', {
    method: 'post',
    body: JSON.stringify({ query: print(query), variables }),
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': getBlinkApiKey(apiKey),
    },
    ...option,
  })
  if (!res.ok) {
    throw Error(await res.text())
  }
  return await res.json()
}

export const manUint = (
  amount: number,
  spaceBeforeUnit = true,
  pivotAmount = 1_000_000,
) => {
  if (!amount) {
    return '0'
  }
  if (Math.abs(amount) < pivotAmount) {
    return Math.floor(amount).toLocaleString()
  }

  if (amount >= BTCUNIT) {
    return (
      Math.floor((amount * 100) / BTCUNIT) / 100 +
      (spaceBeforeUnit ? ' 억' : '억')
    )
  }

  return (
    Math.floor(amount / 10000).toLocaleString() +
    (spaceBeforeUnit ? ' 만' : '만')
  )
}

export const username = (from: From) => {
  if (from.username) {
    return `${from.first_name} @${from.username}`
  }
  return from.first_name
}

export function fetchBtcPriceBinance(): Promise<number> {
  return req
    .get(`https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT`)
    .then(res => Number(res.price))
}

export const getBtcPriceBinance = sequentialInvoke<number>(
  fnWithCache(function btcPriceBinance() {
    return fetchBtcPriceBinance()
  }, 3000),
)

export const getWithdrawLimit = async (balance: Balance) => {
  if (typeof balance.available === 'number') {
    return balance.available
  }
  if (typeof balance.remainingLimit === 'number') {
    const binanceBtcPrice = await getBtcPriceBinance()
    return Math.floor(balance.remainingLimit * (BTCUNIT / binanceBtcPrice))
  }

  throw new Error(`Invalid balance: ${JSON.stringify(balance)}`)
}

export const OUT_OF_AMOUNT_RANGE = `🙅 ${BUYER_AMOUNT_MIN.toLocaleString()}원 ~ ${manUint(
  BUYER_AMOUNT_MAX,
  false,
  100_000,
)}원까지 구매 가능합니다.`

export function formatError(err) {
  const errMsg = typeof err === 'string' ? err : err?.message

  if (!errMsg) {
    return 'No error message'
  }

  return errMsg.replaceAll('\\', '') // for more readable
}

export const byWhom = (msg: Msg, trade: Trade) => {
  const chatId = msg.chat.id
  const whoMsg =
    oneOf([
      [chatId === trade.sellerChatId, `판매자(${trade.sellerName})에 의해 `],
      [chatId === trade.buyerChatId, `구매자(${trade.lnAddress})에 의해 `],
      [chatId === CHAT_ID.admin, '관리자에 의해 '],
    ]) ?? `[${username(msg.from)}]에 의해 `

  return whoMsg
}

export const userInfoFormat = (info: Msg): string =>
  `${info.text}\n${username(info.from)} ${dateFormat(info.date * 1000)}`

export const ellipsisStr = (str: string, maxLength = 200) =>
  str.length > maxLength ? str.slice(0, maxLength) + '..' : str
