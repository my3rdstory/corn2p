import { existsSync, readFileSync, writeFileSync } from 'fs'
import { omit, propEq } from 'ramda'
import { Buyer, Seller, Trade } from '../types'
import { assert, evolve } from '../utils/lib'
import logger from '../utils/logger'
import { DB_PATH } from './config'

const dbPath = DB_PATH

logger.info({ dbPath })

interface DB {
  sellers: Seller[]
  buyers: Buyer[]
  trades: Trade[]
}

let db: DB

const fileExists = existsSync(dbPath)
if (fileExists) {
  const data = readFileSync(dbPath, {
    encoding: 'utf8',
    flag: 'r',
  })

  db = JSON.parse(data)
} else {
  db = { sellers: [], trades: [], buyers: [] }
}

export const pushUser = (type: 'buyers' | 'sellers') => data => {
  db[type].push(data)
  writeFileSync(dbPath, JSON.stringify(db, null, 2))
}

export const hideSecret = omit(['chatId', 'apiKey', 'pushBulletKey'])

export const findSeller = chatId => db.sellers.find(propEq(chatId, 'chatId'))

export const findBuyer = chatId => db.buyers.find(propEq(chatId, 'chatId'))

export const pushSeller = (seller: Seller) => pushUser('sellers')(seller)

export const findTrade = (id: string) => db.trades.find(propEq(id, 'id'))
export const findTradeByAuthMemo = (authMemo: string) =>
  db.trades.find(propEq(authMemo, 'authMemo'))

export const pushBuyer = (buyer: Buyer) => pushUser('buyers')(buyer)

export const pushTrades = (trade: Trade) => {
  db.trades.push(trade)
}
export const getSellers = (): Seller[] => db.sellers
export const getBuyers = (): Buyer[] => db.buyers
export const getTrades = (): Trade[] => db.trades

export const setSellers = setter => set('sellers')(setter)
export const setBuyers = setter => set('buyers')(setter)
export const setTrades = setter => set('trades')(setter)

export type TradeSetter = (trade: Trade) => Trade
export type SellerSetter = (seller: Seller) => Seller
export type BuyerSetter = (buyer: Buyer) => Buyer

export const updateTrade = (id: string, setter: TradeSetter) => {
  const idx = getTrades().findIndex(propEq(id, 'id'))
  if (idx < 0) {
    return -1
  }
  setTrades(evolve({ [idx]: setter }))
}

export const updateSeller = (chatId: number, setter: SellerSetter) => {
  const idx = getSellers().findIndex(propEq(chatId, 'chatId'))
  if (idx < 0) {
    return -1
  }
  setSellers(evolve({ [idx]: setter }))
}

export const updateBuyer = (chatId: number, setter: BuyerSetter) => {
  const idx = getBuyers().findIndex(propEq(chatId, 'chatId'))
  if (idx < 0) {
    return -1
  }
  setBuyers(evolve({ [idx]: setter }))
}

export const set = name => setter => {
  assert(typeof setter === 'function', `setter is not a function`)
  db[name] = setter(db[name])
  writeFileSync(dbPath, JSON.stringify(db, null, 2))
}
