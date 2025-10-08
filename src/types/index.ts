export interface Seller {
  chatId: number
  name: string
  premium: number
  apiKey: string
  pushBulletKey: string
  bankAccount: string
  contact: string
  hidden: boolean
  enabled: boolean
  authMemo: string
  createdAt: number
  updatedAt: number
  lastTradeAt: number
  tradeAcc: {
    krw: number
    sats: number
    count: number
  }
  from?: From
  todayAcc: any
}

export interface Balance {
  satsBalance: number
  remainingLimit?: number
  available?: number
}

export interface SellerWithBalance extends Seller {
  balance: Balance
  maxKrw: number
  satsNotSended: Trade[]
  tradesExpired: Trade[]
  tradesInProgress: Trade[]
}

export interface From {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
  language_code: string
}

export interface Msg {
  message_id?: number
  chat: {
    id: number
    first_name?: string
    username?: string
    type?: string
  }
  date: number
  text?: string
  from: From
  entities?: [any]
}

export interface Buyer {
  chatId: number
  lnAddress: string
  from?: From
  createdAt: number
  updatedAt?: number // 마지막 거래 시간으로 사용됨
  tradeAcc: {
    krw: number
    sats: number
    count: number
  }
  todayAcc: any
}

export interface SellerWebSocket {
  chatId: number
  name: string
  pushBulletKey: string
  ws: WebSocket
}

export interface Trade {
  id: string
  createdAt: number
  updatedAt: number
  expiredAt: number
  krwPaidAt?: number
  satsSended: boolean
  txFeePaid: boolean
  amountKrw: number
  premium: number
  feeSats: number
  fullSats: number
  amountSats: number
  txFee: number
  txFeeRate: number
  btcPrice: number
  btcPriceBinance: number
  krwusd: number
  paymentQuoteId?: string
  paymentFeeQuoteId?: string
  paymentLnInvoice?: string
  paymentFeeLnInvoice?: string
  sellerChatId: number
  sellerName: string
  sellerSatsBalance: number
  bankAccount: string
  buyerChatId: number
  lnAddress: string
  authMemo: string
}
