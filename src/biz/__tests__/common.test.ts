import {
  byWhom,
  ellipsisStr,
  formatError,
  genAuthMemo,
  getWithdrawLimit,
  manUint,
  OUT_OF_AMOUNT_RANGE,
  satsToWon,
  userInfoFormat,
  username,
  wonToSats,
} from '../common'
import { CHAT_ID } from '../config'

import gql from 'graphql-tag'
import type * as CommonAll from '../common'

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    verbose: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    if: jest.fn(() => ({
      verbose: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    })),
  },
}))

const sendMsgMock_more = jest.fn()
jest.mock('../get-tele-bot', () => ({
  __esModule: true,
  sendMsg: (...args) => sendMsgMock_more(...args),
}))

const reqGetMock_more = jest.fn()
const reqPatchMock_more = jest.fn()
const reqPostMock_more = jest.fn()
jest.mock('../../utils/req', () => ({
  __esModule: true,
  req: {
    get: (...args) => reqGetMock_more(...args),
    patch: (...args) => reqPatchMock_more(...args),
    post: (...args) => reqPostMock_more(...args),
  },
}))

const getBlinkApiKeyMock_more = jest.fn(x => x)
const getStrikeApiKeyMock_more = jest.fn(x => x)
const getDecApiKeyMock_more = jest.fn(x => x)
jest.mock('../encrypt', () => ({
  __esModule: true,
  getBlinkApiKey: x => getBlinkApiKeyMock_more(x),
  getStrikeApiKey: x => getStrikeApiKeyMock_more(x),
  getDecApiKey: x => getDecApiKeyMock_more(x),
}))

describe('common.ts 주요 로직', () => {
  test('manUint: pivot 미만/만 단위/억 단위', () => {
    // 0 및 falsy
    expect(manUint(0)).toBe('0')
    // pivot 미만
    expect(manUint(12_345, true, 1_000_000)).toBe('12,345')
    // 만 단위 (억 미만, pivot 이상)
    expect(manUint(123_456, true, 100_000)).toBe('12 만')
    // 억 단위 (BTCUNIT 이상)
    expect(manUint(100_000_000)).toBe('1 억')
  })

  test('username: username 존재/없음', () => {
    const fromWith = {
      id: 1,
      is_bot: false,
      first_name: '철수',
      username: 'chul',
      language_code: 'ko',
    } as any
    const fromWithout = {
      id: 2,
      is_bot: false,
      first_name: '영희',
      language_code: 'ko',
    } as any
    expect(username(fromWith)).toBe('철수 @chul')
    expect(username(fromWithout)).toBe('영희')
  })

  test('ellipsisStr: 최대 길이 초과 시 말줄임', () => {
    const s = 'a'.repeat(210)
    expect(ellipsisStr(s)).toBe('a'.repeat(200) + '..')
    expect(ellipsisStr('short')).toBe('short')
  })

  test('OUT_OF_AMOUNT_RANGE 텍스트 포함 확인', () => {
    expect(OUT_OF_AMOUNT_RANGE).toContain('🙅')
    expect(OUT_OF_AMOUNT_RANGE).toContain('구매 가능합니다')
  })

  test('getWithdrawLimit: available 우선', async () => {
    const balance = {
      satsBalance: 0,
      available: 777,
      remainingLimit: 123,
    } as any
    await expect(getWithdrawLimit(balance)).resolves.toBe(777)
  })

  test('getWithdrawLimit: remainingLimit 존재 시 환산 (binance 가격 모킹)', async () => {
    const commonModule = require('../common')
    jest
      .spyOn(commonModule, 'getBtcPriceBinance')
      .mockResolvedValueOnce(100_000_000)
    const balance = { satsBalance: 0, remainingLimit: 123 } as any
    await expect(getWithdrawLimit(balance)).resolves.toBe(
      Math.floor(123 * (100_000_000 / 100_000_000)),
    )
  })

  test('getWithdrawLimit: invalid balance 처리', async () => {
    await expect(getWithdrawLimit({ satsBalance: 0 } as any)).rejects.toThrow(
      'Invalid balance',
    )
  })

  test('byWhom: seller/buyer/admin/fallback', () => {
    const trade = {
      id: 't1',
      createdAt: 0,
      updatedAt: 0,
      expiredAt: 0,
      krwPaidAt: undefined,
      satsSended: false,
      txFeePaid: false,
      amountKrw: 0,
      premium: 0,
      feeSats: 0,
      fullSats: 0,
      amountSats: 0,
      txFee: 0,
      txFeeRate: 0,
      btcPrice: 0,
      btcPriceBinance: 0,
      krwusd: 0,
      sellerChatId: 10,
      sellerName: '판매자',
      sellerSatsBalance: 0,
      bankAccount: '',
      buyerChatId: 20,
      lnAddress: 'buyer@blink.sv',
      authMemo: '',
      paymentQuoteId: undefined,
      paymentFeeQuoteId: undefined,
      paymentLnInvoice: undefined,
      paymentFeeLnInvoice: undefined,
    } as any
    const baseFrom = {
      id: 1,
      is_bot: false,
      first_name: '홍길동',
      language_code: 'ko',
    } as any
    const mkMsg = (chatId: number) =>
      ({ from: baseFrom, chat: { id: chatId }, date: 0, text: '' } as any)

    expect(byWhom(mkMsg(10), trade)).toContain('판매자(판매자)')
    expect(byWhom(mkMsg(20), trade)).toContain('구매자(buyer@blink.sv)')
    expect(byWhom(mkMsg(CHAT_ID.admin), trade)).toContain('관리자에 의해')
    // fallback: unknown chat id -> username 포함
    expect(byWhom(mkMsg(999), trade)).toContain('[홍길동]에 의해')
  })

  test('genAuthMemo: WORDS 두 단어 결합', () => {
    const memo = genAuthMemo()
    expect(typeof memo).toBe('string')
    expect(memo.length).toBeGreaterThanOrEqual(2)
  })
})

test('formatError', () => {
  expect(
    formatError({
      message: `[422] {"traceId":"0HN6OMHC4D9PT:00000001","data":{"status":422,"code":"UNPROCESSABLE_ENTITY","message":"LNURL service error: Failed to get invoice: unknown error"}}`,
    }),
  ).toEqual(
    `[422] {"traceId":"0HN6OMHC4D9PT:00000001","data":{"status":422,"code":"UNPROCESSABLE_ENTITY","message":"LNURL service error: Failed to get invoice: unknown error"}}`,
  )

  expect(
    formatError({
      message: ``,
    }),
  ).toEqual('No error message')

  expect(
    formatError({
      message: `hello world`,
    }),
  ).toEqual('hello world')

  expect(
    formatError({
      message: `[500] {xxx}`,
    }),
  ).toEqual(`[500] {xxx}`)

  expect(formatError(`[500] {xxx}`)).toEqual(`[500] {xxx}`) // 이런 경우도 있더라;;
})

test('userInfoFormat', () => {
  expect(
    userInfoFormat({
      message_id: 338063,
      from: {
        id: 6746354268,
        is_bot: false,
        first_name: '쵸파',
        language_code: 'ko',
      },
      chat: { id: 6746354268, first_name: '쵸파', type: 'private' },
      date: 1733174830,
      text: '/confirmkrwandsendsats_9edcc745',
      entities: [{ offset: 0, length: 31, type: 'bot_command' }],
    }),
  ).toEqual('/confirmkrwandsendsats_9edcc745\n쵸파 12/3 06:27:10')

  expect(
    userInfoFormat({
      message_id: 320749,
      from: {
        id: 1357077982,
        is_bot: false,
        first_name: '비트카일',
        username: 'BTC_KYLE',
        language_code: 'en',
      },
      chat: {
        id: 1357077982,
        first_name: '비트카일',
        username: 'BTC_KYLE',
        type: 'private',
      },
      date: 1732632566,
      text: '/list',
      entities: [{ offset: 0, length: 5, type: 'bot_command' }],
    }),
  ).toEqual('/list\n비트카일 @BTC_KYLE 11/26 23:49:26')
})

test('wonToSats & satsToWon', () => {
  expect(wonToSats(10_000, 100_000_000)).toEqual(10000)
  expect(satsToWon(10_000, 100_000_000)).toEqual(10000)

  expect(wonToSats(123123, 124_000_000)).toEqual(99292)
  expect(satsToWon(99292, 124_000_000)).toEqual(123122)

  expect(wonToSats(14_667, 6_000_000)).toEqual(244450)
  expect(satsToWon(244450, 6_000_000)).toEqual(14667)

  expect(wonToSats(12_431, 120_000_000)).toEqual(10359)
  expect(satsToWon(10359, 120_000_000)).toEqual(12430)
})

describe('common.ts 보강 테스트(common.more 병합)', () => {
  const originalFetch = global.fetch
  let commonAll: typeof CommonAll

  beforeEach(async () => {
    jest.resetModules()
    sendMsgMock_more.mockReset()
    reqGetMock_more.mockReset()
    reqPatchMock_more.mockReset()
    reqPostMock_more.mockReset()
    getBlinkApiKeyMock_more.mockReset()
    getStrikeApiKeyMock_more.mockReset()
    getDecApiKeyMock_more.mockReset()
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => '',
    })

    commonAll = await import('../common')
  })

  afterAll(() => {
    ;(global as any).fetch = originalFetch
  })

  test('notiLog/off & notiAdmin', () => {
    commonAll.notiLog('hello', { level: 'off' })
    expect(sendMsgMock_more).toHaveBeenCalled()
    commonAll.notiAdmin('admin-msg')
    expect(sendMsgMock_more).toHaveBeenCalled()
  })

  test('getStrikeBalance ok & error', async () => {
    reqGetMock_more.mockResolvedValueOnce([
      { currency: 'USD', total: 0, available: 0 },
      { currency: 'BTC', total: 0.12345678, available: 0.02345678 },
    ])
    const res = await commonAll.getStrikeBalance('k')
    expect(res.balance).toBe(Math.round(0.12345678 * 100_000_000))
    expect(res.available).toBe(Math.round(0.02345678 * 100_000_000))

    reqGetMock_more.mockResolvedValueOnce({
      data: { status: 401, code: 'UNAUTHORIZED' },
    })
    await expect(commonAll.getStrikeBalance('k')).rejects.toThrow(
      'UNAUTHORIZED',
    )
  })

  test('_getSatsBalance branches & cache', async () => {
    getDecApiKeyMock_more.mockReturnValueOnce('blink_abc')
    jest
      .spyOn(commonAll, 'getWalletInfo' as any)
      .mockResolvedValueOnce({ id: 'w', balance: 123, remainingLimit: 4500 })
    const out1 = await commonAll._getSatsBalance('k')
    expect(out1).toEqual({ satsBalance: 123, remainingLimit: 45 })

    getDecApiKeyMock_more.mockReturnValueOnce('sk_live')
    jest
      .spyOn(commonAll, 'getStrikeBalance' as any)
      .mockResolvedValueOnce({ balance: 789, available: 456 })
    const out2 = await commonAll._getSatsBalance('k')
    expect(out2).toEqual({ satsBalance: 789, available: 456 })

    getDecApiKeyMock_more.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    const out3 = await commonAll._getSatsBalance('k')
    expect(out3).toEqual({ satsBalance: 0, available: 0, remainingLimit: 0 })

    const spy = jest
      .spyOn(commonAll, '_getSatsBalance')
      .mockResolvedValue({ satsBalance: 1 }) as any
    const r1 = await commonAll.getSatsBalance('abc12345')
    const r2 = await commonAll.getSatsBalance('abc12345')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(r1).toEqual(r2)
  })

  test('sendSatsBlink ok & assert', async () => {
    jest
      .spyOn(commonAll, 'getWalletInfo')
      .mockResolvedValueOnce({ id: 'w1' } as any)
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { lnInvoicePaymentSend: { status: 'SUCCESS', errors: [] } },
      }),
      text: async () => '',
    })
    const ok = await commonAll.sendSatsBlink({
      blinkApiKey: 'blink_x',
      memo: 'm',
      paymentLnInvoice: 'lnbc...',
    })
    expect(ok.lnInvoicePaymentSend.status).toBe('SUCCESS')

    await expect(
      commonAll.sendSatsBlink({
        blinkApiKey: 'blink_x',
        memo: 'm',
        paymentLnInvoice: '',
      } as any),
    ).rejects.toThrow('Not found paymentLnInvoice')
  })

  test('sendSatsStrike ok & already-paid & assert', async () => {
    reqPatchMock_more.mockResolvedValueOnce({
      state: 'COMPLETED',
      totalAmount: { amount: '0.00000001' },
    })
    const ok = await commonAll.sendSatsStrike({
      apiKey: 'k',
      paymentQuoteId: 'pq',
    })
    expect(ok.state).toBe('COMPLETED')

    reqPatchMock_more.mockRejectedValueOnce(
      new Error(
        '[422] {"traceId":"0","data":{"status":422,"code":"INVALID_STATE_FOR_INVOICE_PAID","message":"Invoice has already been paid."}}',
      ),
    )
    const mapped = await commonAll.sendSatsStrike({
      apiKey: 'k',
      paymentQuoteId: 'pq',
    })
    expect(mapped.data.code).toBe('INVALID_STATE_FOR_INVOICE_PAID')

    try {
      commonAll.sendSatsStrike({ apiKey: 'k', paymentQuoteId: '' } as any)
      fail('should throw')
    } catch (e: any) {
      expect(e.message).toContain('Not found paymentQuoteId')
    }
  })

  test('getWalletInfo assert & success', async () => {
    ;(global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { me: null },
        errors: [{ message: 'Not authorized' }],
      }),
      text: async () => '',
    })
    await expect(commonAll.getWalletInfo('k')).rejects.toThrow('Not authorized')
    ;(global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          me: {
            defaultAccount: {
              wallets: [
                { id: 'usd', walletCurrency: 'USD', balance: 0 },
                { id: 'wbtc', walletCurrency: 'BTC', balance: 555 },
              ],
              limits: {
                withdrawal: [
                  { totalLimit: 0, remainingLimit: 12300, interval: 'd' },
                ],
              },
            },
          },
        },
      }),
      text: async () => '',
    })
    const info = await commonAll.getWalletInfo('k')
    expect(info).toEqual({ id: 'wbtc', balance: 555, remainingLimit: 12300 })
  })

  test('reqGraphql http error bubbles', async () => {
    ;(global as any).fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, text: async () => 'HTTP 500' })
    await expect(
      commonAll.reqGraphql({
        apiKey: 'k',
        query: gql`
          query X {
            __typename
          }
        ` as any,
      }),
    ).rejects.toThrow('HTTP 500')
  })
})
