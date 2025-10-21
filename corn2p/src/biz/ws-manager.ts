import WebSocket from 'ws'
import { checkPayment, enableSeller, nameEmoji } from '.'
import { Seller, SellerWebSocket } from '../types'
import { assoc, dateFormat, propEq } from '../utils/lib'
import logger from '../utils/logger'
import { notiAdmin, notiLog } from './common'
import { CHAT_ID } from './config'
import { findSeller, getSellers } from './db-manager'
import { decrypt } from './encrypt'
import { sendMsg } from './get-tele-bot'

let wsList: SellerWebSocket[] = []

export const createWs = ({
  pushBulletKey,
  sellerChatId,
  sellerName,
}): WebSocket => {
  const ws = new WebSocket(
    `wss://stream.pushbullet.com/websocket/${decrypt(pushBulletKey)}`,
  )

  ws.onopen = function open() {
    // notiLog(`${seller.name}'s WebSocket connected`)
    logger.verbose(`${sellerName}'s WebSocket connected`)
    // notiAdmin(`${seller.name}'s WebSocket connected`)
  }

  ws.onmessage = async function incoming({ data }) {
    const _seller = findSeller(sellerChatId)
    if (!_seller || _seller.hidden) {
      // 판매자가 삭제된 경우라면 _seller 가 널값일 수 있으므로 이에 대한 확인이 반드시 필요!
      return
    }
    const message = JSON.parse(data as string)
    const isSkipPush =
      message.type === 'nop' ||
      !message.push ||
      !(message.push.title || message.push.body) ||
      message.push.title === '수신 전화' ||
      !(
        (message.push.title + message.push.body).includes('입금')
        //  || (message.push.title + message.push.body).includes('입출금')
      ) ||
      message.push.application_name === '텔레그램' ||
      message.push.package_name === 'org.telegram.messenger'

    if (isSkipPush) {
      return
    }
    const pushMsg = `${nameEmoji(_seller)}PushBullet
(${message.push.application_name}) ${
      message.push.title
    } ${message.push.body.replaceAll('\n', ' ')}`

    try {
      sendMsg(CHAT_ID.push, pushMsg)
      sendMsg(_seller.chatId, pushMsg)
      await checkPayment(message, _seller)
      if (!_seller.enabled) {
        await enableSeller(message, _seller)
      }
    } catch (err: any) {
      const message = `[WS ONMESSAGE ERR] ${dateFormat()} ${pushMsg} ${
        err.message
      }`
      notiLog(message)
      logger.error(message)
    }
  }

  ws.onerror = async function error(err: any) {
    const msg = `[Creating ws error] ${sellerName} ${err.message}`
    notiLog(msg, { level: 'error' })
    const userMsg =
      '🙅‍♀️ 푸시불릿 연결에 실패했습니다. 푸시불릿 Key 가 유효하지 않은 것 같습니다. 푸시불릿 Key를 재발급하고, /deleteseller 로 판매자 삭제 후 다시 판매자 등록을 시도해 보세요. 반복적으로 오류가 발생할 경우 관리자에게 문의해 주세요.'
    sendMsg(sellerChatId, userMsg)
    notiAdmin(msg + '\n' + userMsg)
    sendMsg(CHAT_ID.error, msg)
  }

  ws.onclose = function (event) {
    try {
      const message = `[Pushbullet-${sellerName}] WebSocket closed [${
        event.code
      }] ${reasonMap(event).get(event.code) ?? '원인을 알 수 없는 오류'}`

      notiLog(message, { level: 'warn' })

      if (event.code === 1006) {
        wsList = wsList.filter(item => item.chatId !== sellerChatId)
        const seller = findSeller(sellerChatId)
        if (!seller) {
          notiLog(`[${sellerName}] 삭제된 판매자이므로 WebSocket 재생성 skip`, {
            level: 'warn',
          })
          return
        }
        if (!seller.enabled) {
          notiLog(
            `[${sellerName}] 푸시불릿 정상동작 확인된 판매자가 아니므로 WebSocket 재생성 skip`,
            {
              level: 'warn',
            },
          )
          return
        }
        wsList.push({
          chatId: sellerChatId,
          name: sellerName,
          pushBulletKey,
          // @ts-ignore
          ws: createWs({
            pushBulletKey,
            sellerChatId,
            sellerName,
          }),
        })
        notiLog(`[${sellerName}] WebSocket recreated`, { level: 'warn' })
      }
    } catch (err: any) {
      notiLog(`[ws.onclose error] ${err.message}`, { level: 'error' })
    }
  }

  return ws
}

export const pushWs = async (seller: Seller) => {
  if (wsList.some(propEq(seller.chatId, 'chatId'))) {
    /**
     * 해당 분기문 매우 중요
     * 요거 없으면 중복 출금을 시도
     * (사실 그래도 라이트닝 인보이스 기반이기 때문에 중복 출금이 발생하지는 않지만)
     *
     */
    notiLog(`[pushWs] ${seller.name}'s Pushbullet WebSocket already exists`)
    return
  }
  wsList.push({
    chatId: seller.chatId,
    name: nameEmoji(seller),
    pushBulletKey: seller.pushBulletKey,
    // @ts-ignore
    ws: createWs({
      pushBulletKey: seller.pushBulletKey,
      sellerChatId: seller.chatId,
      sellerName: seller.name,
    }),
  })
}

export const popWs = async (chatId: number) => {
  const sellerWs: SellerWebSocket | undefined = findWs(chatId)
  if (!sellerWs) {
    notiLog(`[popWs] Not found ${chatId}'s Pushbullet WebSocket`)
    return
  }

  wsList = wsList.filter(item => item.chatId !== chatId)
  logger.verbose(`${sellerWs.name}'s ws filtered`, wsList.map(assoc('ws', '-')))

  sellerWs.ws.close() // 이게 처리가 깔끔하게 잘 안될 수 있음;;
  notiLog(`${sellerWs.name}'s ws closed.`, { level: 'warn' })
}

export const findWs = chatId => wsList.find(propEq(chatId, 'chatId'))

export const getWsList = (): SellerWebSocket[] => wsList

export const initWsList = () => {
  const sellers = getSellers()

  sellers.forEach(seller => {
    if (!seller.pushBulletKey) {
      return
    }
    pushWs(seller)
  })
}

const reasonMap = event =>
  new Map([
    [1000, '정상 종료'],
    [
      1001,
      '엔드포인트가 “떠나간” 상황. 예컨대 서버가 다운되거나, 브라우저가 페이지에서 나간 경우',
    ],
    [1002, '프로토콜 오류'],
    [
      1003,
      '허용되지 않은 데이터 유형을 수신으로 인한 종료. (예: 텍스트 데이터만 이해할 수 있는 엔드포인트가 바이너리 메시지를 받은 경우)',
    ],
    [
      1004,
      '1004번 종료 이벤트 코드는 예약돼 있지만 현재는 의미가 없음. 향후에 의미가 정의될 수 있음',
    ],
    [1005, '의도적인 ws.close() 종료'],
    [1006, '비정상 종료'],
    [
      1007,
      '엔드포인트가 메시지 내에서 일치하지 않는 데이터를 받음. (예: 텍스트 메시지 내의 비 UTF-8 데이터)',
    ],
    [
      1008,
      '정책 위반(다른 적합한 원인이 없거나, 정책에 대한 구체적인 세부 사항을 숨길 필요가 있을 때)',
    ],
    [1009, '메시지 처리 용량 초과'],
    [
      1010,
      '서버에서 하나 이상의 확장을 협상할 것으로 예상했지만, 서버가 WebSocket 핸드셰이크의 응답 메시지에서 그것들을 반환하지 않음. 구체적으로 필요한 확장은 : ' +
        event.reason,
    ],
    [
      1011,
      '서버가 요청을 완료하는 데 방해가 되는 예기치 않은 상황에 직면하여 연결을 종료',
    ],
    [1015, 'TLS 핸드셰이크 수행 실패(ex. 서버 인증서를 검증할 수 없음).'],
  ])
