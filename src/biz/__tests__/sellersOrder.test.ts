import { sellersOrder } from '..'
import dayjsKo from '../../utils/dayjs-ko'
import { sort } from '../../utils/lib'

describe('sellersOrder', () => {
  test('프리미엄 1순위', () => {
    const mmdd = dayjsKo().format('MMDD')
    const sellers = [
      {
        chatId: 2,
        satsBalance: 2000000,
        premium: 1.6,
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 1,
        satsBalance: 2000000,
        premium: 1.5,
        tradesExpired: [],
        tradesInProgress: [],
      },
    ]

    expect(sort(sellersOrder)(sellers)).toEqual([
      {
        chatId: 1,
        satsBalance: 2000000,
        premium: 1.5,
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 2,
        satsBalance: 2000000,
        premium: 1.6,
        tradesExpired: [],
        tradesInProgress: [],
      },
    ])
  })

  test('1순위 - 프리미엄', () => {
    const mmdd = dayjsKo().format('MMDD')
    const sellers = [
      {
        chatId: 2,
        satsBalance: 2000000,
        premium: 1.6,
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 1,
        satsBalance: 2000000,
        premium: 1.5,
        tradesExpired: [],
        tradesInProgress: [],
      },
    ]

    expect(sort(sellersOrder)(sellers)).toEqual([
      {
        chatId: 1,
        satsBalance: 2000000,
        premium: 1.5,
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 2,
        satsBalance: 2000000,
        premium: 1.6,
        tradesExpired: [],
        tradesInProgress: [],
      },
    ])
  })

  test('모든 조건 동일할 경우 순서 유지', () => {
    const mmdd = dayjsKo().format('MMDD')
    const sellers = [
      {
        chatId: 2,
        balance: { satsBalance: 2000000 },
        premium: 1.5,
        todayAcc: { [mmdd]: { krw: 100 } },
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 1,
        balance: { satsBalance: 2000000 },
        premium: 1.5,
        todayAcc: { [mmdd]: { krw: 100 } },
        tradesExpired: [],
        tradesInProgress: [],
      },
    ]

    expect(sort(sellersOrder)(sellers)).toEqual([
      {
        chatId: 2,
        balance: { satsBalance: 2000000 },
        premium: 1.5,
        todayAcc: { [mmdd]: { krw: 100 } },
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 1,
        balance: { satsBalance: 2000000 },
        premium: 1.5,
        todayAcc: { [mmdd]: { krw: 100 } },
        tradesExpired: [],
        tradesInProgress: [],
      },
    ])
  })

  test('미정산 개수 오름차순', () => {
    const mmdd = dayjsKo().format('MMDD')
    const sellers = [
      {
        chatId: 1,
        balance: { satsBalance: 2000000 },
        premium: 1.5,
        tradesExpired: [{}],
        tradesInProgress: [],
      },
      {
        chatId: 2,
        balance: { satsBalance: 2000000 },
        premium: 1.5,
        tradesExpired: [],
        tradesInProgress: [],
      },
    ]

    expect(sort(sellersOrder)(sellers)).toEqual([
      {
        chatId: 2,
        balance: { satsBalance: 2000000 },
        premium: 1.5,
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 1,
        balance: { satsBalance: 2000000 },
        premium: 1.5,
        tradesExpired: [{}],
        tradesInProgress: [],
      },
    ])
  })

  test('4순위 - 오전/오후 판매량 오름차순', () => {
    const mmdd = dayjsKo().format('MMDD')
    const sellers = [
      {
        chatId: 1,
        balance: { satsBalance: 2_000_000 },
        premium: 1.5,
        todayAcc: {
          [mmdd]: { krw: 200 },
          오전: { krw: 200 },
          오후: { krw: 200 },
        },
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 2,
        balance: { satsBalance: 2_000_000 },
        premium: 1.5,
        todayAcc: {
          [mmdd]: { krw: 100 },
          오전: { krw: 100 },
          오후: { krw: 100 },
        },
        tradesExpired: [],
        tradesInProgress: [],
      },
    ]

    expect(sort(sellersOrder)(sellers)).toEqual([
      {
        chatId: 2,
        balance: { satsBalance: 2_000_000 },
        premium: 1.5,
        todayAcc: {
          [mmdd]: { krw: 100 },
          오전: { krw: 100 },
          오후: { krw: 100 },
        },
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 1,
        balance: { satsBalance: 2_000_000 },
        premium: 1.5,
        todayAcc: {
          [mmdd]: { krw: 200 },
          오전: { krw: 200 },
          오후: { krw: 200 },
        },
        tradesExpired: [],
        tradesInProgress: [],
      },
    ])
  })

  test('4순위 - 오늘 판매량 없을때 오전/오후 판매량 오름차순', () => {
    const mmdd = dayjsKo().format('MMDD')
    const sellers = [
      {
        chatId: 1,
        balance: { satsBalance: 2_000_000 },
        premium: 1.5,
        todayAcc: {
          어제: { krw: 200 },
          오전: { krw: 200 },
          오후: { krw: 200 },
        },
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 2,
        balance: { satsBalance: 2_000_000 },
        premium: 1.5,
        todayAcc: {
          [mmdd]: { krw: 100 },
          오전: { krw: 100 },
          오후: { krw: 100 },
        },
        tradesExpired: [],
        tradesInProgress: [],
      },
    ]

    expect(sort(sellersOrder)(sellers)).toEqual([
      {
        chatId: 1,
        balance: { satsBalance: 2_000_000 },
        premium: 1.5,
        todayAcc: {
          어제: { krw: 200 },
          오전: { krw: 200 },
          오후: { krw: 200 },
        },
        tradesExpired: [],
        tradesInProgress: [],
      },
      {
        chatId: 2,
        balance: { satsBalance: 2_000_000 },
        premium: 1.5,
        todayAcc: {
          [mmdd]: { krw: 100 },
          오전: { krw: 100 },
          오후: { krw: 100 },
        },
        tradesExpired: [],
        tradesInProgress: [],
      },
    ])
  })
})
