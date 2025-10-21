// 외부 의존성 모킹
jest.mock('..', () => ({
  __esModule: true,
  createQuote: jest.fn(),
  exchangePriceInfo: jest.fn(() => '(info)'),
  getPaymentInvoice: jest.fn(),
  getTxFee: jest.fn(),
  getWonDollarRate: jest.fn(() => 1330),
  nameEmoji: jest.fn((seller: any) => seller.name + '✨'),
}))

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    verbose: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('../common', () => ({
  __esModule: true,
  genAuthMemo: jest.fn(() => 'AB'),
  getBtcPriceBinance: jest.fn(async () => 1000),
  wonToSats: jest.fn(() => 12345),
}))

jest.mock('../db-manager', () => ({
  __esModule: true,
  setTrades: jest.fn(),
}))

jest.mock('../encrypt', () => ({
  __esModule: true,
  getDecApiKey: jest.fn(),
}))

jest.mock('../config', () => ({
  __esModule: true,
  ADMIN_ADDRESS: 'blink_admin@blink.sv',
  KRW_DEPOSIT_EXPIRE: 10,
}))

import type { Buyer, Seller } from '../../types'

const fixedNow = 1_700_000_000_000

const mkSeller = (overrides: Partial<Seller> = {}): Seller => ({
  chatId: 10,
  name: '판매자',
  premium: 5,
  apiKey: 'api',
  pushBulletKey: 'o.abc',
  bankAccount: '케이뱅크/123-12-123456/*석*',
  contact: 'contact',
  hidden: false,
  enabled: true,
  authMemo: 'AUTH',
  createdAt: fixedNow - 1000,
  updatedAt: fixedNow - 1000,
  lastTradeAt: 0,
  tradeAcc: { krw: 0, sats: 0, count: 0 },
  todayAcc: {},
  ...overrides,
})

const mkBuyer = (overrides: Partial<Buyer> = {}): Buyer => ({
  chatId: 20,
  lnAddress: 'user@blink.sv',
  createdAt: fixedNow - 2000,
  tradeAcc: { krw: 0, sats: 0, count: 0 },
  todayAcc: {},
  ...overrides,
})

describe('create-trade', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow)
  })

  test('블링크 경로: txFee > 0 인보이스 생성 및 필드 세팅', async () => {
    const { getDecApiKey } = await import('../encrypt')
    ;(getDecApiKey as jest.Mock).mockReturnValue('blink_XXXX')

    const { getPaymentInvoice, getTxFee } = await import('..')
    ;(getTxFee as jest.Mock).mockReturnValue({ txFee: 321, txFeeRate: 0.12 })
    ;(getPaymentInvoice as jest.Mock)
      .mockResolvedValueOnce('pr-tx')
      .mockResolvedValueOnce('pr-fee')

    const { setTrades } = await import('../db-manager')

    const createTrade = (await import('../create-trade')).default

    const seller = mkSeller()
    const buyer = mkBuyer()

    const trade = await createTrade({
      seller,
      buyer,
      amountKrw: 10000,
      amountSats: 9000,
      fullSats: 10000,
      feeSats: 1000,
      sellerSatsBalance: 5_000_000,
      btcPrice: 100_000_000,
    })

    expect(typeof trade.id).toBe('string')
    expect(trade.id.length).toBe(8)
    expect(trade.createdAt).toBe(fixedNow)
    expect(trade.sellerName).toBe('판매자✨')
    expect(trade.paymentLnInvoice).toBe('pr-tx')
    expect(trade.paymentFeeLnInvoice).toBe('pr-fee')
    expect(trade.paymentQuoteId).toBeUndefined()
    expect(trade.txFee).toBe(321)
    expect(trade.txFeePaid).toBe(false)
    expect(typeof (setTrades as jest.Mock).mock.calls[0][0]).toBe('function')
  })

  test("블링크 경로: txFee = 0 수수료 인보이스 '-' 및 txFeePaid=true", async () => {
    const { getDecApiKey } = await import('../encrypt')
    ;(getDecApiKey as jest.Mock).mockReturnValue('blink_XXXX')

    const { getPaymentInvoice, getTxFee } = await import('..')
    ;(getTxFee as jest.Mock).mockReturnValue({ txFee: 0, txFeeRate: 0 })
    ;(getPaymentInvoice as jest.Mock).mockResolvedValueOnce('pr-tx')

    const createTrade = (await import('../create-trade')).default

    const trade = await createTrade({
      seller: mkSeller(),
      buyer: mkBuyer(),
      amountKrw: 10000,
      amountSats: 10000,
      fullSats: 10000,
      feeSats: 0,
      sellerSatsBalance: 5_000_000,
      btcPrice: 100_000_000,
    })

    expect(trade.paymentLnInvoice).toBe('pr-tx')
    expect(trade.paymentFeeLnInvoice).toBe('-')
    expect(trade.txFeePaid).toBe(true)
  })

  test('스트라이크 경로: quote 생성 및 수수료 인보이스', async () => {
    const { getDecApiKey } = await import('../encrypt')
    ;(getDecApiKey as jest.Mock).mockReturnValue('strike_YYYY')

    const { createQuote, getPaymentInvoice, getTxFee } = await import('..')
    ;(getTxFee as jest.Mock).mockReturnValue({ txFee: 111, txFeeRate: 0.05 })
    ;(createQuote as jest.Mock).mockResolvedValue({ paymentQuoteId: 'quote-1' })
    ;(getPaymentInvoice as jest.Mock).mockResolvedValueOnce('pr-fee-1')

    const createTrade = (await import('../create-trade')).default

    const trade = await createTrade({
      seller: mkSeller(),
      buyer: mkBuyer({ lnAddress: 'user@strike.me' }),
      amountKrw: 20000,
      amountSats: 18000,
      fullSats: 20000,
      feeSats: 2000,
      sellerSatsBalance: 9_000_000,
      btcPrice: 120_000_000,
    })

    expect(trade.paymentQuoteId).toBe('quote-1')
    expect(trade.paymentFeeLnInvoice).toBe('pr-fee-1')
    expect(trade.paymentLnInvoice).toBeUndefined()
    expect(trade.txFee).toBe(111)
    expect(trade.txFeePaid).toBe(false)
  })
})
