import dayjs from 'dayjs'
import createLogger, { simpleFormat } from 'if-logger'
import {
  ellipsisStr,
  formatError,
  genAuthMemo,
  notiLog,
  userInfoFormat,
} from '../biz/common'
import { CHAT_ID } from '../biz/config'
import { sendMsg } from '../biz/get-tele-bot'
import { dateFormat } from '../utils/lib'
import { withAuth } from './helpers/with-auth'
import adminDeleteTrade from './admin/admin-delete-trade'
import adminEditP from './admin/admin-edit-p'
import adminHideMe from './admin/admin-hide-me'
import adminTradesNotPaid from './admin/admin-trades-not-paid'
import allBuyers from './admin/all-buyers'
import allSellers from './admin/all-sellers'
import allTrades from './admin/all-trades'
import clearTradeCompleted from './admin/clear-trade-completed'
import clearTradeNotPaid from './admin/clear-trade-not-paid'
import adminDeleteBuyer from './admin/delete-buyer'
import adminDeleteSeller from './admin/delete-seller'
import wsList from './admin/ws-list'
import amountBuy from './handlers/amount-buy'
import buy from './handlers/buy'
import buyerInfo from './handlers/buyer-info'
import chatId from './handlers/chat-id'
import commandLogger from './handlers/command-logger'
import auth from './handlers/auth'
import confirmKrw from './handlers/confirm-krw'
import confirmKrwAndSendSats from './handlers/confirm-krw-and-send-sats'
import confirmSatsSended from './handlers/confirm-sats-sended'
import deleteBuyer from './handlers/delete-buyer'
import deleteSeller from './handlers/delete-seller'
import deleteTrade from './handlers/delete-trade'
import deleteTradeNotPaid from './handlers/delete-trade-not-paid'
import editAccount from './handlers/edit-account'
import editContact from './handlers/edit-contact'
import editP from './handlers/edit-p'
import help from './handlers/help'
import hideMe from './handlers/hide-me'
import list from './handlers/list'
import myInfo from './handlers/my-info'
import n from './handlers/n'
import newBuyer from './handlers/new-buyer'
import newSeller from './handlers/new-seller'
import newSellerIphone from './handlers/new-seller-iphone'
import price from './handlers/price'
import priceList from './handlers/price-list'
import sellerInfo from './handlers/seller-info'
import showMe from './handlers/show-me'
import tradeInfo from './handlers/trade-info'
import tradesNotPaid from './handlers/trades-not-paid'

export const initBotCommands = bot => {
  const addCommand = getAddCommand(bot)
  const addProtectedCommand = (reg, handler) =>
    addCommand(reg, withAuth(handler))

  // 공통 명령
  addProtectedCommand(
    new RegExp(`^\/help(?:@${process.env.TELEGRAM_BOT_USERNANE})?$`, 'i'),
    help,
  )
  addCommand(/^\/auth$/i, auth)
  addProtectedCommand(/^\/chatid$/i, chatId)
  addProtectedCommand(
    new RegExp(`^\/myinfo(?:@${process.env.TELEGRAM_BOT_USERNANE})?$`, 'i'),
    myInfo,
  )

  addProtectedCommand(
    new RegExp(`^\/price(?:@${process.env.TELEGRAM_BOT_USERNANE})?$`, 'i'),
    price,
  )
  addProtectedCommand(
    new RegExp(`^\/list(?:@${process.env.TELEGRAM_BOT_USERNANE})?$`, 'i'),
    list,
  )
  addProtectedCommand(
    new RegExp(`^\/pricelist(?:@${process.env.TELEGRAM_BOT_USERNANE})?$`, 'i'),
    priceList,
  )
  addProtectedCommand(/^\/tradeinfo (\S+)$/i, tradeInfo)
  addProtectedCommand(/^\/sellerinfo (\S+)$/i, sellerInfo)

  // 안드로이드 판매자 등록
  addProtectedCommand(
    /^\/newseller (\S+) (\S+) (\S+) (\S+) (\S+) (\S+)$/i,
    newSeller,
  )
  addProtectedCommand(
    /^\/newseller (\S+) (\S+) (\S+) (\S+) (\S+)$/i,
    newSeller,
  )
  addProtectedCommand(
    /^\/newseller (\S+) (\S+) (\S+) (\S+)$/i,
    newSeller,
  )
  addProtectedCommand(
    /^\/newseller (\S+) (\S+) (\S+)$/i,
    newSeller,
  )
  addProtectedCommand(/^\/newseller (\S+) (\S+)$/i, newSeller)
  addProtectedCommand(/^\/newseller (\S+)$/i, newSeller)
  addProtectedCommand(/^\/newseller$/i, newSeller)

  // 아이폰 판매자 등록
  addProtectedCommand(
    /^\/newselleriphone (\S+) (\S+) (\S+) (\S+) (\S+)$/i,
    newSellerIphone,
  )
  addProtectedCommand(
    /^\/newselleriphone (\S+) (\S+) (\S+) (\S+)$/i,
    newSellerIphone,
  )
  addProtectedCommand(
    /^\/newselleriphone (\S+) (\S+) (\S+)$/i,
    newSellerIphone,
  )
  addProtectedCommand(/^\/newselleriphone (\S+) (\S+)$/i, newSellerIphone)
  addProtectedCommand(/^\/newselleriphone (\S+)$/i, newSellerIphone)
  addProtectedCommand(/^\/newselleriphone$/i, newSellerIphone)

  // 구매자 명령
  addProtectedCommand(/^\/buy (\S+) (\S+)$/i, buy)
  addProtectedCommand(/^\/buy (\S+)$/i, buy)
  addProtectedCommand(/^\/buy$/i, buy)
  addProtectedCommand(/^\/deletebuyer$/i, deleteBuyer)
  addProtectedCommand(/^\/deletetrade$/i, deleteTrade)
  addProtectedCommand(/^\/deletetrade (\S+)$/i, deleteTrade)
  addProtectedCommand(/^\/deletetrade_([0-9a-f]{8})$/i, deleteTrade)
  addProtectedCommand(/^\/(\d)$/i, n)
  addProtectedCommand(/^\/(\d)[ _](\S+)$/i, n)
  addProtectedCommand(
    new RegExp(`^\\/(\\d{2,})(?:@${process.env.TELEGRAM_BOT_USERNANE})?$`, 'i'),
    amountBuy,
  )

  // 판매자 명령
  addProtectedCommand(/^\/newbuyer (\S+)$/i, newBuyer)
  addProtectedCommand(/^\/deleteseller$/i, deleteSeller)
  addProtectedCommand(/^\/hideme$/i, hideMe)
  addProtectedCommand(/^\/showme$/i, showMe)
  addProtectedCommand(/^\/editp (\S+)$/i, editP)
  addProtectedCommand(/^\/editp$/i, editP)
  addProtectedCommand(/^\/editcontact (\S+)$/i, editContact)
  addProtectedCommand(/^\/editaccount (\S+)$/i, editAccount)
  addProtectedCommand(
    /^\/editaccount (\S+) (\S+) (\S+)$/i,
    editAccount,
  )
  addProtectedCommand(/^\/tradesNotPaid$/i, tradesNotPaid)
  addProtectedCommand(/^\/tnp$/i, tradesNotPaid)
  addProtectedCommand(/^\/confirmkrw_([0-9a-f]{8})$/i, confirmKrw)
  addProtectedCommand(
    /^\/confirmkrwandsendsats_([0-9a-f]{8})$/i,
    confirmKrwAndSendSats,
  )
  addProtectedCommand(
    /^\/deletetradenotpaid_([0-9a-f]{8})$/i,
    deleteTradeNotPaid,
  )
  addProtectedCommand(
    /^\/confirmsatssended_([0-9a-f]{8})$/i,
    confirmSatsSended,
  )
  addProtectedCommand(/^\/buyerinfo (\S+)$/i, buyerInfo)

  // 관리자 명령
  addProtectedCommand(/^\/adminwslist$/i, wsList)
  addProtectedCommand(/^\/adminallsellers$/i, allSellers)
  addProtectedCommand(/^\/adminallbuyers$/i, allBuyers)
  addProtectedCommand(/^\/adminalltrades$/i, allTrades)
  addProtectedCommand(/^\/adminTradesNotPaid$/i, adminTradesNotPaid)
  addProtectedCommand(/^\/atnp$/i, adminTradesNotPaid)
  addProtectedCommand(/^\/admindeletetrade (\S+)$/i, adminDeleteTrade)
  addProtectedCommand(/^\/admindeleteseller (\S+)$/i, adminDeleteSeller)
  addProtectedCommand(/^\/admineditp (\S+) (\S+)$/i, adminEditP)
  addProtectedCommand(/^\/adminhideme (\S+)$/i, adminHideMe)
  addProtectedCommand(/^\/admindeletebuyer (\S+)$/i, adminDeleteBuyer)
  addProtectedCommand(/^\/admindeletebuyer_(\d+)/i, adminDeleteBuyer)
  addProtectedCommand(
    /^\/admincleartradecompleted$/i,
    clearTradeCompleted,
  )
  addProtectedCommand(
    /^\/admincleartradenotpaid$/i,
    clearTradeNotPaid,
  )

  // 명령어 로깅
  bot.onText(/.+/, commandLogger(bot))

  // 명령어 목록 설정
  bot.setMyCommands([
    { command: '/auth', description: 'Discord 역할 인증 🔐' },
    { command: '/help', description: '이용가이드 🤖' },
    { command: '/price', description: '비트코인 시세 📈' },
    { command: '/list', description: '판매자 목록 📜' },
    { command: '/pricelist', description: '비트코인 시세 & 판매자 목록 📈📜' },
    { command: '/myinfo', description: '나의 등록 정보 📄' },
    { command: '/10000', description: '1만원 구매 💰' },
    { command: '/30000', description: '3만원 구매 💰' },
    { command: '/100000', description: '10만원 구매 💰' },
    { command: '/200000', description: '20만원 구매 💰' },
    { command: '/300000', description: '30만원 구매 💰' },
    { command: '/500000', description: '50만원 구매 💰' },
    { command: '/1000000', description: '100만원 구매 💰' },
  ])
}

const getAddCommand = bot => (reg, handler) => {
  const wrapper = async (msg, match) => {
    const msgId = genAuthMemo()
    const timeLabel = `(${msgId}) ${msg.text}`

    const logger = createLogger({
      format: simpleFormat,
      tags: [() => dayjs().format('YYYY-MM-DD HH:mm:ss')],
    })

    try {
      logger.log.time(timeLabel)

      const result = await handler(bot)(msg, match)
      return result
    } catch (err: any) {
      const userInfo = `\n\n${userInfoFormat(msg)}`
      const errMsg =
        `${dateFormat()} ❌ 오류ID: (${msgId})\n\n` +
        (formatError(err) ?? 'No error message')

      notiLog(ellipsisStr(errMsg))
      sendMsg(CHAT_ID.error, errMsg + userInfo)
      sendMsg(msg.chat.id, ellipsisStr(errMsg)) // to user
    } finally {
      logger.log.timeEnd(timeLabel)
    }
  }
  bot.onText(reg, wrapper)
}
