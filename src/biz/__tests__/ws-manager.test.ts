import type WebSocket from 'ws'

// Mock: ws (WebSocket)
jest.mock('ws', () => {
  class MockWebSocket {
    public url: string
    public onopen?: () => void
    public onmessage?: (ev: { data: string }) => Promise<void> | void
    public onerror?: (err: any) => Promise<void> | void
    public onclose?: (ev: { code: number; reason?: string }) => void

    constructor(url: string) {
      this.url = url
    }

    close() {
      // 기본 close: 정상 종료 이벤트 트리거
      this.onclose && this.onclose({ code: 1000 })
    }
  }
  return MockWebSocket
})

// Mocks for dependencies used inside ws-manager
jest.mock('..', () => ({
  checkPayment: jest.fn(),
  enableSeller: jest.fn(),
  nameEmoji: jest.fn((seller: any) => seller.name),
}))

jest.mock('../db-manager', () => ({
  findSeller: jest.fn(),
  getSellers: jest.fn(),
}))

jest.mock('../encrypt', () => ({
  decrypt: jest.fn((k: string) => k),
}))

jest.mock('../get-tele-bot', () => ({
  sendMsg: jest.fn(),
}))

jest.mock('../common', () => ({
  notiAdmin: jest.fn(),
  notiLog: jest.fn(),
}))

jest.mock('../config', () => ({
  CHAT_ID: { push: 111, error: 222, admin: 333 },
}))

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    verbose: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

const loadWsManager = async () => {
  // 동적 import로 모듈 상태(wsList)를 테스트마다 초기화
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return await import('../ws-manager')
}

const mkSeller = (overrides: Partial<any> = {}) => ({
  chatId: 10,
  name: '판매자',
  premium: 0,
  apiKey: 'api',
  pushBulletKey: 'o.abcdefg12345678901234567890',
  bankAccount: '케이뱅크/123-12-123456/*석*',
  contact: 'https://open.kakao.com/o/xxx',
  hidden: false,
  enabled: true,
  authMemo: 'ABC',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastTradeAt: 0,
  tradeAcc: { krw: 0, sats: 0, count: 0 },
  todayAcc: {},
  ...overrides,
})

beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

describe('ws-manager', () => {
  test('pushWs: 신규 추가 및 중복 방지', async () => {
    const wsManager = await loadWsManager()
    const { pushWs, getWsList } = wsManager
    const seller = mkSeller({ chatId: 1, name: '철수' })

    await pushWs(seller)
    expect(getWsList().length).toBe(1)

    await pushWs(seller)
    expect(getWsList().length).toBe(1)
  })

  test('popWs: 제거 및 close 호출', async () => {
    const wsManager = await loadWsManager()
    const { pushWs, popWs, getWsList } = wsManager
    const seller = mkSeller({ chatId: 2, name: '영희' })

    await pushWs(seller)
    expect(getWsList().length).toBe(1)

    await popWs(seller.chatId)
    expect(getWsList().length).toBe(0)
  })

  test('initWsList: pushBulletKey 있는 판매자만 ws 생성', async () => {
    const wsManager = await loadWsManager()
    const { initWsList, getWsList } = wsManager

    const { getSellers } = await import('../db-manager')
    ;(getSellers as jest.Mock).mockReturnValue([
      mkSeller({ chatId: 10, name: 'A', pushBulletKey: '' }),
      mkSeller({ chatId: 11, name: 'B', pushBulletKey: 'o.valid' }),
    ])

    await initWsList()
    expect(getWsList().length).toBe(1)
    expect(getWsList()[0].chatId).toBe(11)
  })

  test('createWs.onmessage: skip 조건(type=nop)일 때 아무 동작 없음', async () => {
    const wsManager = await loadWsManager()
    const { createWs } = wsManager

    const seller = mkSeller({ chatId: 3, name: '둘리' })
    const { findSeller } = await import('../db-manager')
    ;(findSeller as jest.Mock).mockReturnValue(seller)

    const ws = createWs({
      pushBulletKey: seller.pushBulletKey,
      sellerChatId: seller.chatId,
      sellerName: seller.name,
    }) as unknown as WebSocket & {
      onmessage: (ev: { data: string }) => Promise<void> | void
    }

    const { sendMsg } = await import('../get-tele-bot')
    const { checkPayment } = await import('..')

    await ws.onmessage?.({ data: JSON.stringify({ type: 'nop' }) })

    expect((sendMsg as jest.Mock).mock.calls.length).toBe(0)
    expect((checkPayment as jest.Mock).mock.calls.length).toBe(0)
  })

  test('createWs.onmessage: 유효 push 시 noti 및 checkPayment 호출', async () => {
    const wsManager = await loadWsManager()
    const { createWs } = wsManager

    const seller = mkSeller({ chatId: 4, name: '또치', enabled: true })
    const { findSeller } = await import('../db-manager')
    ;(findSeller as jest.Mock).mockReturnValue(seller)

    const ws = createWs({
      pushBulletKey: seller.pushBulletKey,
      sellerChatId: seller.chatId,
      sellerName: seller.name,
    }) as unknown as WebSocket & {
      onmessage: (ev: { data: string }) => Promise<void> | void
    }

    const { sendMsg } = await import('../get-tele-bot')
    const { checkPayment, enableSeller } = await import('..')

    const message = {
      type: 'push',
      push: {
        application_name: '카카오뱅크',
        title: '입금',
        body: '입금 10,000원 테스트',
      },
    }

    await ws.onmessage?.({ data: JSON.stringify(message) })

    expect((sendMsg as jest.Mock).mock.calls.some(c => c[0] === 111)).toBe(true) // CHAT_ID.push
    expect(
      (sendMsg as jest.Mock).mock.calls.some(c => c[0] === seller.chatId),
    ).toBe(true)
    expect((checkPayment as jest.Mock).mock.calls[0][0]).toEqual(message)
    expect((checkPayment as jest.Mock).mock.calls[0][1]).toEqual(seller)
    // enabled=true 이므로 enableSeller는 호출되지 않음
    expect((enableSeller as jest.Mock).mock.calls.length).toBe(0)
  })

  test('createWs.onmessage: 내부 에러 발생 시 notiLog/logger.error 호출', async () => {
    const wsManager = await loadWsManager()
    const { createWs } = wsManager

    const seller = mkSeller({ chatId: 5, name: '마이콜', enabled: true })
    const { findSeller } = await import('../db-manager')
    ;(findSeller as jest.Mock).mockReturnValue(seller)

    const ws = createWs({
      pushBulletKey: seller.pushBulletKey,
      sellerChatId: seller.chatId,
      sellerName: seller.name,
    }) as unknown as WebSocket & {
      onmessage: (ev: { data: string }) => Promise<void> | void
    }

    const { checkPayment } = await import('..')
    ;(checkPayment as jest.Mock).mockRejectedValueOnce(new Error('oops'))

    const { notiLog } = await import('../common')
    const logger = (await import('../../utils/logger')).default as any

    const message = {
      type: 'push',
      push: {
        application_name: '카카오뱅크',
        title: '입금',
        body: '입금 20,000원 테스트',
      },
    }

    await ws.onmessage?.({ data: JSON.stringify(message) })

    expect((notiLog as jest.Mock).mock.calls.length).toBeGreaterThan(0)
    expect((logger.error as jest.Mock).mock.calls.length).toBeGreaterThan(0)
  })

  test('ws.onerror: 사용자/관리자/에러 채널로 안내 전송', async () => {
    const wsManager = await loadWsManager()
    const { createWs } = wsManager

    const seller = mkSeller({ chatId: 6, name: '도우너' })

    const ws = createWs({
      pushBulletKey: seller.pushBulletKey,
      sellerChatId: seller.chatId,
      sellerName: seller.name,
    }) as unknown as WebSocket & {
      onerror: (err: any) => Promise<void> | void
    }

    const { sendMsg } = await import('../get-tele-bot')
    const { notiAdmin } = await import('../common')

    await ws.onerror?.({ message: 'invalid key' })

    // 사용자/관리자/에러 채널 호출 확인
    const calls = (sendMsg as jest.Mock).mock.calls
    expect(calls.some(c => c[0] === seller.chatId)).toBe(true)
    expect(calls.some(c => c[0] === 222)).toBe(true) // CHAT_ID.error
    expect((notiAdmin as jest.Mock).mock.calls.length).toBeGreaterThan(0)
  })

  test('ws.onclose: code=1006 시, 판매자 존재/활성화된 경우 재생성', async () => {
    const wsManager = await loadWsManager()
    const { pushWs, getWsList } = wsManager

    const seller = mkSeller({ chatId: 7, name: '희동', enabled: true })
    const { findSeller } = await import('../db-manager')
    ;(findSeller as jest.Mock).mockReturnValue(seller)

    await pushWs(seller)
    expect(getWsList().length).toBe(1)
    const target = getWsList()[0]

    // onclose(1006) 트리거 -> 재생성 로직 동작 후 다시 1개 유지
    ;(target.ws as any).onclose?.({ code: 1006, reason: '' })
    expect(getWsList().length).toBe(1)
  })
})
