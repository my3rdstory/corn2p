import { getAmountSats } from '..'
import { Buyer, Msg, SellerWithBalance } from '../../types'
import { COUNT } from '../../utils/lib'
import buySats from '../buy-sats'
import {
  BUYER_AMOUNT_MAX,
  BUYER_AMOUNT_MIN,
  MAX_LENGTH_TRADES_NOT_PAID,
  TOO_MANY_REQUEST_LIMIT,
} from '../config'

jest.mock('../db-manager')
jest.mock('../get-tele-bot')
jest.mock('../create-trade', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('../common')
jest.mock('..', () => ({
  getAmountSats: jest.fn(),
  getTxFee: jest.fn(),
  shorten: jest.fn(),
  validNumber: jest.fn(),
  tradeTldr: jest.fn(() => 'TLDR'),
  serializeTrade: jest.fn(() => 'SERIALIZED_TRADE'),
}))

describe('buySats', () => {
  const mockMsg: Msg = {
    chat: { id: 12345 },
    date: Date.now() / 1000,
    from: {
      id: 12345,
      is_bot: false,
      first_name: 'Test',
      username: 'testuser',
      language_code: 'ko',
    },
  }

  const mockBuyer: Buyer = {
    chatId: 12345,
    lnAddress: 'test@example.com',
    createdAt: Date.now(),
    tradeAcc: { krw: 0, sats: 0, count: 0 },
    todayAcc: {},
  }

  const mockSeller: SellerWithBalance = {
    chatId: 67890,
    name: 'Test Seller',
    premium: 5,
    apiKey: 'test-api-key',
    pushBulletKey: 'test-push-key',
    bankAccount: 'Test Bank Account',
    contact: 'Test Contact',
    hidden: false,
    enabled: true,
    authMemo: 'test-memo',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastTradeAt: Date.now(),
    tradeAcc: { krw: 0, sats: 0, count: 0 },
    from: mockMsg.from,
    todayAcc: {},
    balance: { satsBalance: 1000000 },
    maxKrw: 500000,
    satsNotSended: [],
    tradesExpired: [],
    tradesInProgress: [],
  }

  beforeEach(() => {
    // COUNT 초기화
    COUNT.sendMessage = 0
    // 모킹된 함수들 초기화
    jest.clearAllMocks()
    // 기본적으로 미정산 거래 없음
    const { getTrades } = require('../db-manager')
    getTrades.mockReturnValue([])
  })

  test('과도한 트래픽으로 인한 거래 생성 차단', async () => {
    // COUNT.sendMessage를 제한값보다 크게 설정
    COUNT.sendMessage = TOO_MANY_REQUEST_LIMIT + 1

    const { sendMsg } = require('../get-tele-bot')
    const { notiLog } = require('../common')

    await buySats({
      seller: mockSeller,
      amountKrw: 10000,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      expect.stringContaining(
        '과도한 트래픽으로 현재 신규 거래 생성이 불가합니다',
      ),
    )
    expect(notiLog).toHaveBeenCalled()
  })

  test('금액 범위 초과 시 거래 생성 차단', async () => {
    const { sendMsg } = require('../get-tele-bot')
    const { notiLog } = require('../common')

    // 최소 금액보다 작은 경우
    await buySats({
      seller: mockSeller,
      amountKrw: BUYER_AMOUNT_MIN - 1,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      expect.stringContaining('원까지 구매 가능합니다'),
    )
    expect(notiLog).toHaveBeenCalled()

    // 최대 금액보다 큰 경우
    await buySats({
      seller: mockSeller,
      amountKrw: BUYER_AMOUNT_MAX + 1,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      expect.stringContaining('원까지 구매 가능합니다'),
    )
  })

  test('비트코인 가격 오류 시 거래 생성 차단', async () => {
    const { sendMsg } = require('../get-tele-bot')
    const { notiLog } = require('../common')

    // btcPrice가 0인 경우
    await buySats({
      seller: mockSeller,
      amountKrw: 10000,
      msg: mockMsg,
      btcPrice: 0,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      'UPBIT_BTC_PRICE_ERROR',
    )
    expect(notiLog).toHaveBeenCalledWith('UPBIT_BTC_PRICE_ERROR')

    // btcPrice가 정수가 아닌 경우
    await buySats({
      seller: mockSeller,
      amountKrw: 10000,
      msg: mockMsg,
      btcPrice: 100000000.5,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      'UPBIT_BTC_PRICE_ERROR',
    )
  })

  test('판매자 최대 금액 초과 시 거래 생성 차단', async () => {
    const { sendMsg } = require('../get-tele-bot')

    await buySats({
      seller: mockSeller,
      amountKrw: mockSeller.maxKrw + 1,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      expect.stringContaining('해당 판매자의 최대 구매금액'),
    )
  })

  test('미정산 거래가 있는 판매자에게 구매 차단', async () => {
    const { sendMsg } = require('../get-tele-bot')
    const sellerWithExpiredTrade = {
      ...mockSeller,
      satsNotSended: [
        {
          id: 'test-trade',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiredAt: Date.now() - 1000, // 만료된 거래
          satsSended: false,
          txFeePaid: false,
          amountKrw: 10000,
          premium: 5,
          feeSats: 100,
          fullSats: 10100,
          amountSats: 10000,
          txFee: 0,
          txFeeRate: 0,
          btcPrice: 100000000,
          btcPriceBinance: 100000000,
          krwusd: 1300,
          sellerChatId: 67890,
          sellerName: 'Test Seller',
          sellerSatsBalance: 1000000,
          bankAccount: 'Test Bank Account',
          buyerChatId: 12345,
          lnAddress: 'test@example.com',
          authMemo: 'test-memo',
        },
      ],
    }

    await buySats({
      seller: sellerWithExpiredTrade,
      amountKrw: 10000,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      expect.stringContaining(
        '미정산 거래가 남아있는 판매자에게는 구매가 불가합니다',
      ),
    )
  })

  test('구매자 미정산 거래 개수 제한 초과 시 거래 생성 차단', async () => {
    const { sendMsg } = require('../get-tele-bot')
    const { notiLog } = require('../common')
    const { getTrades } = require('../db-manager')

    // 미정산 거래가 최대 개수만큼 있는 상황 모킹
    const mockTrades = Array(MAX_LENGTH_TRADES_NOT_PAID)
      .fill(null)
      .map((_, index) => ({
        id: `trade-${index}`,
        buyerChatId: mockMsg.chat.id,
        krwPaidAt: null,
      }))
    getTrades.mockReturnValue(mockTrades)

    await buySats({
      seller: mockSeller,
      amountKrw: 10000,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      expect.stringContaining('미정산 거래는 최대'),
    )
    expect(notiLog).toHaveBeenCalled()
  })

  test('판매자 잔액 부족 시 거래 생성 차단', async () => {
    const { sendMsg } = require('../get-tele-bot')

    // getAmountSats 모킹 - 잔액보다 큰 금액 반환
    ;(getAmountSats as jest.Mock).mockReturnValue({
      feeSats: 0,
      amountSats: 1000000, // 판매자 잔액보다 큰 값
      fullSats: 1000000,
    })

    await buySats({
      seller: mockSeller,
      amountKrw: 10000,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      "Not enough seller's satsBalance.",
    )
  })

  test('정상적인 거래 생성 시 모든 알림 전송', async () => {
    const { sendMsg } = require('../get-tele-bot')
    const { notiAdmin } = require('../common')
    const createTrade = require('../create-trade').default
    const { getTrades } = require('../db-manager')

    // 모든 조건을 만족하는 상황 설정
    getTrades.mockReturnValue([]) // 미정산 거래 없음
    ;(getAmountSats as jest.Mock).mockReturnValue({
      feeSats: 100,
      amountSats: 10000,
      fullSats: 10100,
    })
    createTrade.mockResolvedValue({
      id: 'test-trade-id',
      sellerName: 'Test Seller',
      authMemo: 'test-memo',
      amountKrw: 10000,
      sellerChatId: 67890,
      bankAccount: 'Test Bank Account',
    })

    await buySats({
      seller: mockSeller,
      amountKrw: 10000,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    // 판매자에게 알림 전송 확인
    expect(sendMsg).toHaveBeenCalledWith(67890, expect.any(String))

    // 관리자에게 알림 전송
    expect(notiAdmin).toHaveBeenCalled()

    // 구매자에게 알림 전송 확인
    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      expect.stringContaining('새로운 거래가 생성되었습니다'),
    )

    // 거래 생성 함수 호출 확인
    expect(createTrade).toHaveBeenCalled()
  })

  test('아이폰 판매자에게 구매 시 추가 안내 메시지 전송', async () => {
    const { sendMsg } = require('../get-tele-bot')
    const { getTrades } = require('../db-manager')
    const createTrade = require('../create-trade').default

    // PushBullet 키가 없는 판매자 (아이폰 판매자)
    const iphoneSeller = {
      ...mockSeller,
      pushBulletKey: '', // PushBullet 키 없음
    }

    getTrades.mockReturnValue([])
    ;(getAmountSats as jest.Mock).mockReturnValue({
      feeSats: 100,
      amountSats: 10000,
      fullSats: 10100,
    })
    createTrade.mockResolvedValue({
      id: 'test-trade-id',
      sellerName: 'Test Seller',
      authMemo: 'test-memo',
      amountKrw: 10000,
      sellerChatId: 67890,
      bankAccount: 'Test Bank Account',
    })

    await buySats({
      seller: iphoneSeller,
      amountKrw: 10000,
      msg: mockMsg,
      btcPrice: 100000000,
      buyer: mockBuyer,
    })

    // 아이폰 판매자 안내 메시지 확인
    expect(sendMsg).toHaveBeenCalledWith(
      mockMsg.chat.id,
      expect.stringContaining('아이폰🍎 판매자에게 구매할 경우'),
    )
  })
})
