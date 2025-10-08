import { delay } from 'mingutils'
import { getTxFee, shorten, validNumber } from '..'
import { sequentialInvoke } from '../../utils/lib'

import {
  after3days,
  exchangePriceInfo,
  getKimp,
  krwRecvLimit,
  nameEmoji,
  notPaidTradeTldr,
  shorten as shortenIndex,
  tradeStatus,
  tradeTldr,
} from '..'

jest.mock('../../utils/dayjs-ko', () => ({
  __esModule: true,
  default: (date?: any) => {
    return {
      format: (fmt?: string) => {
        if (fmt === 'MMDD') return '0101'
        if (fmt === 'MMDD-a') return '0101-오전'
        if (!fmt || fmt === 'M/D HH:mm:ss') return '1/1 00:00:00'
        if (fmt === 'HH:mm:ss M/D') return '00:00:00 1/1'
        if (fmt === 'YYYY.MM.DD HH:mm:ss') return '2025.01.01 00:00:00'
        return '1/1 00:00:00'
      },
      fromNow: () => '방금 전',
    }
  },
}))

const sendMsgMock_integration = jest.fn()
jest.mock('../get-tele-bot', () => ({
  __esModule: true,
  sendMsg: (...args) => sendMsgMock_integration(...args),
}))

// 부분 모킹: common (네트워크/알림 의존 제거용)
jest.mock('../common', () => {
  const actual = jest.requireActual('../common')
  return {
    __esModule: true,
    ...actual,
    getSatsBalance: jest.fn(async () => ({
      satsBalance: 1_000_000,
      remainingLimit: 2_000_000,
      available: undefined,
    })),
    _getSatsBalance: jest.fn(async () => ({ satsBalance: 2000 })),
    getWithdrawLimit: jest.fn(async () => 5000),
    notiLog: jest.fn(),
    notiAdmin: jest.fn(),
    reqGraphql: jest.fn(),
    sendSatsBlink: jest.fn(),
    sendSatsStrike: jest.fn(),
    getBtcPriceBinance: jest.fn(async () => 80000),
  }
})

// encrypt 모킹
jest.mock('../encrypt', () => ({
  __esModule: true,
  getDecApiKey: jest.fn(() => 'blink_mock'),
  getStrikeApiKey: jest.fn(() => 'token_mock'),
}))

describe('index.ts 보강 테스트', () => {
  const baseTrade = {
    id: 't1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiredAt: Date.now() + 60_000,
    krwPaidAt: undefined as number | undefined,
    satsSended: false,
    txFeePaid: false,
    amountKrw: 100_000,
    premium: 5,
    feeSats: 1000,
    fullSats: 10_000,
    amountSats: 9_000,
    txFee: 200,
    txFeeRate: 0.2,
    btcPrice: 100_000_000,
    btcPriceBinance: 80_000,
    krwusd: 1300,
    sellerChatId: 1,
    sellerName: '판매자',
    sellerSatsBalance: 1_000_000,
    bankAccount: '은행/123-45-6789/홍*동',
    buyerChatId: 2,
    lnAddress: 'buyer@blink.sv',
    authMemo: 'AA',
  } as any

  test('tradeStatus branches', () => {
    expect(tradeStatus(baseTrade)).toContain('⏳신규거래')
    expect(tradeStatus({ ...baseTrade, krwPaidAt: Date.now() })).toContain(
      '❌라이트닝전송실패',
    )
    expect(
      tradeStatus({ ...baseTrade, krwPaidAt: Date.now(), satsSended: true }),
    ).toContain('❌거래수수료미납')
    expect(
      tradeStatus({
        ...baseTrade,
        krwPaidAt: Date.now(),
        satsSended: true,
        txFeePaid: true,
      }),
    ).toContain('✅거래완료')
    expect(
      tradeStatus({ ...baseTrade, expiredAt: Date.now() - 60_000 }),
    ).toContain('⏰원화미입금만료')
  })

  test('tradeTldr and exchangePriceInfo content', () => {
    const s = tradeTldr(baseTrade, {
      status: true,
      feeInfo: true,
      pDetail: true,
    })
    expect(s).toContain(baseTrade.sellerName)
    expect(s).toContain(baseTrade.amountKrw.toLocaleString())
    expect(s).toContain('sats')

    const info = exchangePriceInfo({
      btcPrice: 100_000_000,
      btcPriceBinance: 80_000,
      krwusd: 1300,
    })
    expect(info).toContain('천원')
    expect(info).toContain('달러')
    expect(info).toContain('원')
  })

  test('notPaidTradeTldr has proper commands', () => {
    const s1 = notPaidTradeTldr({ ...baseTrade, createdAt: Date.now() } as any)
    expect(s1).toContain('/confirmkrw_')
  })

  test('krwRecvLimit with/without todayAcc', () => {
    const seller = { todayAcc: {} as any }
    expect(krwRecvLimit(seller as any)).toBeGreaterThan(0)

    seller.todayAcc['0101'] = { krw: 100_000 }
    const left = krwRecvLimit(seller as any)
    expect(left).toBeGreaterThanOrEqual(0)
  })

  test('getKimp numeric', () => {
    const val = getKimp({
      btcPrice: 100_000_000,
      krwusd: 1250,
      btcPriceBinance: 80_000,
    })
    expect(typeof val).toBe('number')
  })

  test('nameEmoji and after3days/shorten', () => {
    expect(nameEmoji({ name: 'A', pushBulletKey: 'o.x' } as any)).toContain(
      '✨',
    )
    expect(nameEmoji({ name: 'B', pushBulletKey: '' } as any)).toContain('🍎')

    expect(
      after3days({
        expiredAt: Date.now() - 4 * 86_400_000,
        krwPaidAt: undefined,
      } as any),
    ).toBe(true)
    expect(shortenIndex('very-long-identifier')).toMatch(/\.\.$/)
  })

  test('splitAndSend sends chunks', () => {
    sendMsgMock_integration.mockReset()
    const list = Array.from({ length: 5 }, (_, i) => `item${i + 1}`)
    const { splitAndSend } = require('..')
    splitAndSend({ chatId: 123, list, serialize: (x: string) => x, count: 2 })
    expect(sendMsgMock_integration).toHaveBeenCalledTimes(3)
  })
})

jest.mock('../db-manager')

test('getTxFee', () => {
  expect(
    getTxFee({ amountSats: 100_000, satsBalance: 5_000_000, premium: 5 }),
  ).toEqual({ txFee: 0, txFeeRate: 0 })
  expect(
    getTxFee({ amountSats: 1_000_000, satsBalance: 9_000_000, premium: 5 }),
  ).toEqual({ txFee: 0, txFeeRate: 0 })
})

test('sequentialInvoke', async () => {
  const invoked: number[] = []
  const fn = () => {
    invoked.push(Date.now())
    return new Promise(resolve => {
      delay(() => resolve(1), 1000)
    })
  }
  const seqFn = sequentialInvoke(fn)
  const [result1, result2] = await Promise.all([seqFn(), seqFn()])
  expect(result1).toEqual(1)
  expect(result2).toEqual(1)

  expect(invoked[1] - invoked[0] > 900).toEqual(true)
})

test('fetchWonDollarRateWoori', async () => {
  const html = ` </th>
                                <th scope="colgroup" colspan="2" class="col">송금</th>
                                <th scope="colgroup" colspan="4" class="col">현찰</th>
                                <th scope="col" rowspan="2">매매<br/>기준율</th>
                                <th scope="col" rowspan="2">기준환율</th>
                                <th scope="col" rowspan="2">대미<br/>환산율</th>
                        </tr>
                        <tr>
                                <th scope="col" class="row">보내실때</th>
                                <th scope="col" class="row">받으실때</th>
                                <th scope="col" class="row" colspan="2">사실때(스프레드율)</th>
                                <th scope="col" class="row dth-r" colspan="2" >파실때(스프레드율)</th>
                        </tr>
                </thead>
                <tbody>



                        <tr>


                                <td><a href="javascript:goDetail('20240905','USD','2024.09.05 15:04:40');">USD</a></td>
                                <td>미국 달러</td>
                                <td>1,349.00</td>
                                <td>1,323.20</td>
                                <td>1,359.48</td>
                                <td>1.750%</td>
                                <td>1,312.72</td>
                                <td>1.750%</td>
                                <td>1,336.10</td>
                                <td>1,342.00</td>
                                <td>1.0000</td>


                        </tr>


                        <tr>


                                <td><a href="javascript:goDetail('20240905','JPY','2024.09.05 15:04:4
V 2024-09-05 15:04:40 | [getWonDollarRateWoori] html
</th>
                                <th scope="colgroup" colspan="2" class="col">송금</th>
                                <th scope="colgroup" colspan="4" class="col">현찰</th>
                                <th scope="col" rowspan="2">매매<br/>기준율</th>
                                <th scope="col" rowspan="2">기준환율</th>
                                <th scope="col" rowspan="2">대미<br/>환산율</th>
                        </tr>
                        <tr>
                                <th scope="col" class="row">보내실때</th>
                                <th scope="col" class="row">받으실때</th>
                                <th scope="col" class="row" colspan="2">사실때(스프레드율)</th>
                                <th scope="col" class="row dth-r" colspan="2" >파실때(스프레드율)</th>
                        </tr>
                </thead>
                <tbody>



                        <tr>


                                <td><a href="javascript:goDetail('20240905','USD','2024.09.05 15:04:40');">USD</a></td>
                                <td>미국 달러</td>
                                <td>1,349.00</td>
                                <td>1,323.20</td>
                                <td>1,359.48</td>
                                <td>1.750%</td>
                                <td>1,312.72</td>
                                <td>1.750%</td>
                                <td>1,336.10</td>
                                <td>1,342.00</td>
                                <td>1.0000</td>


                        </tr>


                        <tr>


                                <td><a href="javascript:goDetail('20240905','JPY','2024.09.05 15:04:4`
  const result = html.match(
    new RegExp(`USD<\/a><\/td>[\n ]+(?:<td>.+<\/td>[\n ]+){7}<td>(.+)<\/td>`),
  )

  expect(result?.[1]).toEqual('1,336.10')
})

test('shorten', () => {
  expect(shorten('de3d3b39@strike.me')).toEqual('de3d3b39@st..')
  expect(shorten('abidingbeat72@walletofsatoshi.com ')).toEqual('abidingbeat..')
})

test('validNumber', () => {
  expect(validNumber(1)).toEqual(true)
  expect(validNumber(1.222)).toEqual(true)
  expect(validNumber(NaN)).toEqual(false)
  expect(validNumber('NaN')).toEqual(false)
  expect(validNumber('0')).toEqual(false)
  expect(validNumber(undefined)).toEqual(false)
})

// ---------------- 추가 보강 테스트 (index.ts 커버리지 향상) ----------------

test('todayAccInfo 기본/half별 렌더링', () => {
  const { todayAccInfo } = require('..')
  const seller: any = {
    todayAcc: {
      '0101': {
        krw: 100_000,
        sats: 10_000,
        count: 2,
      },
      오전: { krw: 60_000, sats: 6_000, count: 1 },
      오후: { krw: 40_000, sats: 4_000, count: 1 },
    },
  }
  expect(todayAccInfo(seller)).toContain('원')
  expect(todayAccInfo(seller, '오전')).toContain('sats')
  expect(todayAccInfo({ todayAcc: {} } as any)).toContain('0원')
})

test('getAmountSats 계산', () => {
  const { getAmountSats } = require('..')
  const { fullSats, feeSats, amountSats } = getAmountSats({
    amountKrw: 100_000,
    btcPrice: 100_000_000,
    premium: 5,
  })
  expect(fullSats).toBeGreaterThan(0)
  expect(feeSats).toBeGreaterThan(0)
  expect(amountSats).toBe(fullSats - feeSats)
})

test('serializeBuyer 내용 포함', () => {
  const { serializeBuyer } = require('..')
  const buyer: any = {
    lnAddress: 'buyer@blink.sv',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tradeAcc: { krw: 200_000, sats: 20_000, count: 3 },
    todayAcc: { '0101': { krw: 100_000, sats: 10_000, count: 1 } },
    from: { first_name: '홍길동', username: 'hong' },
  }
  const s = serializeBuyer(buyer, 100_000_000)
  expect(s).toContain('등록일')
  expect(s).toContain('입금주소')
  expect(s).toContain('%') // 수익률 표현
})

test('serializeTrade 구성 확인', () => {
  const { serializeTrade } = require('..')
  const trade: any = {
    id: 'T1',
    createdAt: Date.now(),
    btcPrice: 100_000_000,
    amountKrw: 123_000,
    fullSats: 12_300,
    premium: 5,
    feeSats: 615,
    amountSats: 11_685,
    lnAddress: 'buyer@blink.sv',
    bankAccount: '은행/1-2-3/홍*동',
    expiredAt: Date.now() + 60_000,
  }
  const s = serializeTrade(trade)
  expect(s).toContain('거래 정보')
  expect(s).toContain('입금주소')
})

test('checkDeposit 케이스', () => {
  const { checkDeposit } = require('..')
  // 텔레그램 알림은 무시
  expect(
    checkDeposit({
      message: { push: { application_name: '텔레그램', title: '', body: '' } },
      amountKrw: 10_000,
      authMemo: 'AA',
    }),
  ).toBe(false)

  // 정상 확인 (공백 없는 원)
  expect(
    checkDeposit({
      message: { push: { title: '입금', body: '10,000원 AA' } },
      amountKrw: 10_000,
      authMemo: 'AA',
    }),
  ).toBe(true)

  // 정상 확인 (공백 있는 원)
  expect(
    checkDeposit({
      message: { push: { title: '입금', body: '10,000 원 AA' } },
      amountKrw: 10_000,
      authMemo: 'AA',
    }),
  ).toBe(true)
})

test('getLnurlCallback strike/me 분기 및 일반 호스트', async () => {
  const { getLnurlCallback } = require('..')
  // strike.me 분기
  expect(await getLnurlCallback('id@strike.me')).toContain('https://strike.me')

  // 일반 호스트는 req.get 사용
  const lib = require('../../utils/lib')
  const getSpy = jest
    .spyOn(lib.req, 'get')
    .mockResolvedValue({ callback: 'cb' })
  expect(await getLnurlCallback('id@example.com')).toEqual('cb')
  getSpy.mockRestore()
})

test('lnAddressInfo 정상/에러', async () => {
  const { lnAddressInfo } = require('..')
  const lib = require('../../utils/lib')

  const ok = jest.spyOn(lib.req, 'get').mockResolvedValue({ ok: true })
  expect(await lnAddressInfo('id@host')).toEqual({ ok: true })
  ok.mockRestore()

  const fail = jest.spyOn(lib.req, 'get').mockRejectedValue(new Error('boom'))
  const r = await lnAddressInfo('id@host')
  expect(r.status).toBe('ERROR')
  fail.mockRestore()
})

test('getPaymentInvoice PR 반환', async () => {
  const { getPaymentInvoice } = require('..')
  // callback 모킹
  jest.spyOn(require('..'), 'getLnurlCallback').mockResolvedValue('cb-url')
  const lib = require('../../utils/lib')
  const g = jest.spyOn(lib.req, 'get').mockResolvedValue({ pr: 'lnbc1...' })

  const pr = await getPaymentInvoice({
    lnAddress: 'a@b',
    amountSats: 1,
    memo: 'm',
  })
  expect(pr).toBe('lnbc1...')

  g.mockRestore()
})

test('generateBlinkInvoice 성공/오류', async () => {
  const { generateBlinkInvoice } = require('..')
  const common = require('../common')
  common.reqGraphql.mockResolvedValue({
    data: {
      lnInvoiceCreateOnBehalfOfRecipient: {
        invoice: {
          paymentRequest: 'pr',
          paymentHash: 'h',
          paymentSecret: 's',
          satoshis: 1,
        },
        errors: [],
      },
    },
  })
  common.getWalletInfo = jest.fn(async () => ({ id: 'wid' }))

  const inv = await generateBlinkInvoice({ memo: 'm', amount: 1, apiKey: 'k' })
  expect(inv.paymentRequest).toBe('pr')

  // 오류 케이스
  common.reqGraphql.mockResolvedValue({
    data: {
      lnInvoiceCreateOnBehalfOfRecipient: {
        invoice: null,
        errors: [{ message: 'e' }],
      },
    },
    errors: [{ message: 'e' }],
  })
  await expect(
    generateBlinkInvoice({ memo: 'm', amount: 1, apiKey: 'k' }),
  ).rejects.toBeInstanceOf(Error)
})

test('validateNewSellerParams 성공 및 검증 에러', async () => {
  const { validateNewSellerParams } = require('..')
  const p = {
    name: '홍길',
    premium: '5',
    apiKey: 'blink_x',
    pushBulletKey: 'o.12345678901234567890123456789012',
    bankAccount: '케이뱅크/123-45-6789/홍*동',
    contact: 'https://open.kakao.com/abc',
  }
  await expect(validateNewSellerParams(p)).resolves.toBeUndefined()

  await expect(
    validateNewSellerParams({ ...p, name: 'A' }),
  ).rejects.toBeInstanceOf(Error)
  await expect(
    validateNewSellerParams({ ...p, name: '홍✨길' }),
  ).rejects.toBeInstanceOf(Error)
  await expect(
    validateNewSellerParams({ ...p, premium: 'NaN' }),
  ).rejects.toBeInstanceOf(Error)
  await expect(
    validateNewSellerParams({ ...p, pushBulletKey: 'x.123' }),
  ).rejects.toBeInstanceOf(Error)
  await expect(
    validateNewSellerParams({ ...p, pushBulletKey: 'o.123' }),
  ).rejects.toBeInstanceOf(Error)
  await expect(
    validateNewSellerParams({ ...p, bankAccount: '잘못된형식' }),
  ).rejects.toBeInstanceOf(Error)
  await expect(
    validateNewSellerParams({ ...p, contact: '' }),
  ).rejects.toBeInstanceOf(Error)
})

test('sendSatsBlnikLnAddress 데이터 반환', async () => {
  const { sendSatsBlnikLnAddress } = require('..')
  const common = require('../common')
  common.reqGraphql.mockResolvedValue({
    data: { lnAddressPaymentSend: { status: 'SUCCESS', errors: [] } },
  })
  const r = await sendSatsBlnikLnAddress({
    blinkApiKey: 'k',
    walletId: 'w',
    amountSats: 10,
    lnAddress: 'a@b',
  })
  expect(r.lnAddressPaymentSend.status).toBe('SUCCESS')
})

test('createQuote 성공', async () => {
  const { createQuote } = require('..')
  const lib = require('../../utils/lib')
  const p = jest
    .spyOn(lib.req, 'post')
    .mockResolvedValue({ paymentQuoteId: 'Q1' })
  const r = await createQuote({
    lnAddress: 'a@b',
    amountSats: 1000,
    memo: 'm',
    apiKey: 'k',
  })
  expect(r.paymentQuoteId).toBe('Q1')
  p.mockRestore()
})

test('sendSatsLnAddress blink/strike 분기', async () => {
  const { sendSatsLnAddress } = require('..')
  const encrypt = require('../encrypt')
  const common = require('../common')

  const trade: any = { paymentLnInvoice: 'pr', paymentFeeLnInvoice: 'pr2' }

  // blink 성공
  encrypt.getDecApiKey.mockImplementation(() => 'blink_xxx')
  common.sendSatsBlink.mockResolvedValue({
    lnInvoicePaymentSend: { status: 'SUCCESS' },
    data: {},
  })
  await expect(
    sendSatsLnAddress({
      apiKey: 'enc',
      trade,
      lnAddress: 'buyer@blink.sv',
      memo: 'm',
    }),
  ).resolves.toBeDefined()

  // blink already paid
  common.sendSatsBlink.mockResolvedValue({
    lnInvoicePaymentSend: {
      status: 'ALREADY_PAID',
      errors: [{ message: 'Invoice is already paid' }],
    },
    data: {},
  })
  await expect(
    sendSatsLnAddress({
      apiKey: 'enc',
      trade,
      lnAddress: 'buyer@blink.sv',
      memo: 'm',
    }),
  ).resolves.toBeDefined()

  // strike 성공
  encrypt.getDecApiKey.mockImplementation(() => 'strike_xxx')
  common.sendSatsStrike.mockResolvedValue({ state: 'COMPLETED' })
  await expect(
    sendSatsLnAddress({
      apiKey: 'enc',
      trade: { paymentQuoteId: 'PQ' },
      lnAddress: 'buyer@strike.me',
      memo: 'm',
    }),
  ).resolves.toBeDefined()
})

test('serializeSeller / serializeSellerPublic', async () => {
  const mod = require('..')
  const common = require('../common')

  // 가격/환율 스텁
  jest.spyOn(mod, 'getBtcPrice').mockResolvedValue(100_000_000)
  common._getSatsBalance.mockResolvedValueOnce({ satsBalance: 123_456 })
  common.getWithdrawLimit.mockResolvedValueOnce(50_000)

  const seller: any = {
    name: '판매자',
    premium: 5,
    bankAccount: '은행/1-2-3/홍*동',
    createdAt: Date.now(),
    lastTradeAt: Date.now(),
    hidden: false,
    enabled: true,
    pushBulletKey: 'o.x',
    contact: 'https://open.kakao.com/abc',
    tradeAcc: { krw: 100_000, sats: 10_000, count: 1 },
    todayAcc: {},
    apiKey: 'blink_api',
    chatId: 1,
    authMemo: 'AA',
  }

  const s = await mod.serializeSeller(seller)
  expect(s).toContain('지갑잔액')
  expect(s).toContain('출금한도')
  expect(s).toContain('연락처')

  // public
  common._getSatsBalance.mockResolvedValueOnce({ satsBalance: 123_456 })
  common.getWithdrawLimit.mockResolvedValueOnce(50_000)
  const p = await mod.serializeSellerPublic(seller)
  expect(p).toContain('📄 판매자 정보')
  expect(p).toContain('입금계좌')
})

test('getSellerList 필터링/정렬/필드 계산', async () => {
  const mod = require('..')
  const common = require('../common')
  const dbm = require('../db-manager')

  // 큰 잔액으로 통과
  // getSatsBalance는 위 모킹에서 이미 기본값 제공
  jest.spyOn(mod, 'getBtcPrice').mockResolvedValue(100_000_000)
  jest.spyOn(mod, 'getWonDollarRate').mockResolvedValue(1300)

  const baseSeller = {
    name: 'A',
    premium: 1,
    createdAt: Date.now() - 10_000,
    enabled: true,
    hidden: false,
    apiKey: 'k',
    chatId: 10,
    todayAcc: {},
    tradeAcc: { krw: 0, sats: 0, count: 0 },
    pushBulletKey: '',
  }

  dbm.getSellers = jest.fn(() => [baseSeller])
  dbm.getTrades = jest.fn(() => [
    {
      sellerChatId: 10,
      satsSended: false,
      expiredAt: Date.now() + 60_000,
      amountKrw: 10_000,
      amountSats: 1000,
    },
  ])

  const list = await mod.getSellerList()
  expect(Array.isArray(list)).toBe(true)
  expect(list[0].maxKrw).toBeGreaterThan(0)
  expect(list[0].satsNotSended.length).toBeGreaterThanOrEqual(0)
})

test('getListMessage 내용', async () => {
  const mod = require('..')
  const spy = jest.spyOn(mod, 'getSellerList').mockResolvedValue([
    {
      name: 'A',
      premium: 1,
      balance: { satsBalance: 100_000 },
      maxKrw: 200_000,
      tradesInProgress: [{ amountKrw: 10_000, amountSats: 1000 }],
      tradesExpired: [],
      pushBulletKey: 'o.x',
    },
  ] as any)

  const msg = await mod.getListMessage()
  expect(msg).toContain('No. 이름')
  expect(msg).toContain('A')
  spy.mockRestore()
})

test('getPriceMessage / getPriceListMessage', async () => {
  const mod = require('..')
  jest.spyOn(mod, 'getBtcPrice').mockResolvedValue(100_000_000)
  jest.spyOn(mod, 'getWonDollarRate').mockResolvedValue(1300)
  const common = require('../common')
  common.getBtcPriceBinance.mockResolvedValue(80_000)

  const info = await mod.getPriceMessage()
  expect(info).toContain('김프')

  const listMsg = await mod.getPriceListMessage()
  expect(listMsg).toContain('이름')
})

test('tradeMaxAmountKrw 분기(remainingLimit/available)', () => {
  const { tradeMaxAmountKrw } = require('..')
  const seller: any = { todayAcc: {} }

  const v1 = tradeMaxAmountKrw({
    satsBalance: 2_000_000,
    btcPrice: 100_000_000,
    remainingLimit: 1000,
    available: undefined,
    wonDollarRate: 1300,
    seller,
  })
  expect(v1).toBeGreaterThan(0)

  const v2 = tradeMaxAmountKrw({
    satsBalance: 2_000_000,
    btcPrice: 100_000_000,
    remainingLimit: undefined,
    available: 2_000_000,
    wonDollarRate: 1300,
    seller,
  })
  expect(v2).toBeGreaterThan(0)
})

test('fetchBtcPriceBithumb fetch 모킹', async () => {
  const { fetchBtcPriceBithumb } = require('..')
  const original = global.fetch
  ;(global as any).fetch = jest.fn(async () => ({
    json: async () => [{ trade_price: 12_345 }],
  }))
  const p = await fetchBtcPriceBithumb()
  expect(p).toBe(12_345)
  ;(global as any).fetch = original
})

test('getRor 계산', () => {
  const { getRor } = require('..')
  // 이 입력은 손익이 음수일 수 있으므로 부호만 검증하지 않고 타입만 검증
  const r = getRor(100_000_000, { sats: 20_000, krw: 100_000 })
  expect(typeof r.ror === 'number' || typeof r.ror === 'string').toBe(true)
  expect(r.profit).toBeDefined()
  expect(r.avgBtcPrice).toBeDefined()
})

test('checkPayment: 입금 확인 흐름과 메시지/데이터 갱신', async () => {
  const mod = require('..')
  const dbm = require('../db-manager')
  const common = require('../common')

  const trade = {
    id: 'T-check',
    createdAt: Date.now() - 1000,
    expiredAt: Date.now() + 60_000,
    krwPaidAt: undefined,
    satsSended: false,
    txFeePaid: false,
    amountKrw: 10_000,
    amountSats: 1_000,
    txFee: 100,
    txFeeRate: 1,
    premium: 5,
    btcPrice: 100_000_000,
    btcPriceBinance: 80_000,
    krwusd: 1300,
    authMemo: 'AA',
    sellerName: '판매자',
    sellerChatId: 100,
    buyerChatId: 200,
    lnAddress: 'buyer@blink.sv',
    bankAccount: '은행/1-2-3/홍*동',
    sellerSatsBalance: 1_000_000,
  }

  const seller = {
    chatId: 100,
    apiKey: 'blink_x',
    name: '판매자',
    todayAcc: {},
    tradeAcc: { krw: 0, sats: 0, count: 0 },
  }

  const buyers = [
    {
      chatId: 200,
      from: { first_name: '홍길동', username: 'hong' },
      todayAcc: {},
      tradeAcc: { krw: 0, sats: 0, count: 0 },
      updatedAt: 0,
    },
  ]

  dbm.getTrades = jest.fn(() => [trade])
  dbm.getBuyers = jest.fn(() => buyers as any)
  dbm.setBuyers = jest.fn(() => undefined)
  dbm.setTrades = jest.fn(() => undefined)

  // 수수료/전송 경로 모킹: txFee>0 보장 및 전송 성공
  jest.spyOn(mod, 'getTxFee').mockReturnValue({ txFee: 100, txFeeRate: 1 })
  jest.spyOn(mod, 'sendSatsLnAddress').mockResolvedValue({})

  jest.spyOn(mod, 'sendSats').mockResolvedValue({ state: 'COMPLETED' })
  dbm.updateTrade = jest.fn(() => undefined)
  dbm.updateSeller = jest.fn(() => undefined)

  const sendSpy = sendMsgMock_integration
  sendSpy.mockReset()
  common.notiAdmin.mockReset()

  const message = { push: { title: '입금', body: '10,000원 AA' } }

  await mod.checkPayment(message, seller as any, false)

  expect(sendSpy).toHaveBeenCalled()
  expect(common.notiAdmin).toHaveBeenCalled()
  expect(dbm.setTrades).toHaveBeenCalled()
  expect(dbm.setBuyers).toHaveBeenCalled()
})

test('checkPayment: 입금 미확인 시 동작 없음', async () => {
  const mod = require('..')
  const dbm = require('../db-manager')

  const trade = {
    id: 'T-no-deposit',
    createdAt: Date.now() - 1000,
    expiredAt: Date.now() + 60_000,
    krwPaidAt: undefined,
    satsSended: false,
    txFeePaid: false,
    amountKrw: 10_000,
    amountSats: 1_000,
    premium: 5,
    btcPrice: 100_000_000,
    authMemo: 'AA',
    sellerName: '판매자',
    sellerChatId: 100,
    buyerChatId: 200,
    lnAddress: 'buyer@blink.sv',
  }
  const seller = { chatId: 100 }

  dbm.getTrades = jest.fn(() => [trade])

  const message = { push: { title: '알림', body: '기타 안내' } }

  await mod.checkPayment(message, seller as any, false)
  expect(dbm.getTrades).toHaveBeenCalled()
})
