import sha256 from 'crypto-js/sha256'
import {
  createQuote,
  exchangePriceInfo,
  getPaymentInvoice,
  getTxFee,
  getWonDollarRate,
  nameEmoji,
} from '.'
import { Buyer, Seller, Trade } from '../types'
import { append, dateFormat } from '../utils/lib'
import logger from '../utils/logger'
import { genAuthMemo, getBtcPriceBinance, wonToSats } from './common'
import { ADMIN_ADDRESS, KRW_DEPOSIT_EXPIRE } from './config'
import { MINUTE } from './constants'
import { setTrades } from './db-manager'
import { getDecApiKey } from './encrypt'

interface CreateTradeParams {
  seller: Seller
  buyer: Buyer
  amountKrw: number
  amountSats: number
  fullSats: number
  feeSats: number
  sellerSatsBalance: number
  btcPrice: number
}

export default async function createTrade({
  seller,
  buyer,
  amountKrw,
  amountSats,
  fullSats,
  feeSats,
  sellerSatsBalance,
  btcPrice,
}: CreateTradeParams) {
  /**
   * lnAddress 가 판매자가 허용했던 주소인지 확인
   */
  const authMemo = genAuthMemo()
  const now = Date.now()
  const tradeId = sha256(now + seller.name + buyer.chatId)
    .toString()
    .slice(0, 8)

  const [krwusd, btcPriceBinance] = await Promise.all([
    getWonDollarRate(),
    getBtcPriceBinance(),
  ])

  const summary = `${
    nameEmoji(seller) + authMemo
  } ${amountKrw.toLocaleString()}원 ${amountSats.toLocaleString()}sats ${
    seller.premium
  }% ${exchangePriceInfo({
    btcPrice,
    btcPriceBinance,
    krwusd,
  })} ${buyer.lnAddress} ${tradeId} ${dateFormat(now, 'M/D HH:mm:ss:SSS')}`

  const { txFee, txFeeRate } = getTxFee({
    amountSats: wonToSats(amountKrw, btcPrice),
    satsBalance: sellerSatsBalance,
    premium: seller.premium,
  })

  let paymentLnInvoice, paymentFeeLnInvoice, paymentQuoteId, paymentFeeQuoteId

  const p2pMemo = `[p2p] ${summary}`
  const txFeeMemo = `[Txfee] [ ${txFee}sats / ${txFeeRate}% / ${sellerSatsBalance.toLocaleString()}sats ] ${summary}`

  if (getDecApiKey(seller.apiKey).startsWith('blink_')) {
    const [prTx, prFee] = await Promise.all([
      getPaymentInvoice({
        lnAddress: buyer.lnAddress,
        amountSats,
        memo: p2pMemo,
      }),

      txFee > 0
        ? getPaymentInvoice({
            lnAddress: ADMIN_ADDRESS,
            amountSats: txFee,
            memo: txFeeMemo,
          })
        : '-',
    ])

    paymentLnInvoice = prTx
    paymentFeeLnInvoice = prFee
  } else {
    const [quoteTx, prFee] = await Promise.all([
      createQuote({
        lnAddress: buyer.lnAddress,
        amountSats,
        memo: p2pMemo,
        apiKey: seller.apiKey,
      }),
      txFee > 0
        ? getPaymentInvoice({
            lnAddress: ADMIN_ADDRESS,
            amountSats: txFee,
            memo: txFeeMemo,
          })
        : '-',
    ])
    paymentQuoteId = quoteTx.paymentQuoteId
    paymentFeeLnInvoice = prFee
  }

  const trade: Trade = {
    id: tradeId,
    createdAt: now,
    sellerName: nameEmoji(seller),
    premium: seller.premium,
    krwPaidAt: undefined,
    satsSended: false,
    txFeePaid: txFee > 0 ? false : true,
    amountKrw,
    fullSats,
    feeSats,
    amountSats,
    txFee,
    txFeeRate,
    lnAddress: buyer.lnAddress,
    btcPrice,
    btcPriceBinance,
    krwusd,
    buyerChatId: buyer.chatId,
    sellerChatId: seller.chatId,
    sellerSatsBalance,
    authMemo,
    bankAccount: seller.bankAccount,
    paymentLnInvoice,
    paymentFeeLnInvoice,
    paymentQuoteId,
    paymentFeeQuoteId,
    expiredAt: now + MINUTE * KRW_DEPOSIT_EXPIRE,
    updatedAt: now,
  }
  setTrades(append(trade))

  logger.info(`[Trade created] ${summary}`)

  return trade
}
