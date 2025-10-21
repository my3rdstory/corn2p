import { CHAT_ID } from '../../biz/config'
import { decrypt } from '../../biz/encrypt'
import { sendMsg } from '../../biz/get-tele-bot'
import { getWsList } from '../../biz/ws-manager'

export default function wsList(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    if (chatId !== CHAT_ID.admin) {
      return
    }

    const list = getWsList()

    if (list.length === 0) {
      sendMsg(chatId, 'No result')
      return
    }
    console.log(
      '>> wsList',
      list.map(item => ({ ...item, ws: '-' })),
    )

    const message = list
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.name}  ${item.chatId}  ${
            item.pushBulletKey
              ? decrypt(item.pushBulletKey).slice(-8)
              : 'noPushBulletKey'
          }`,
      )
      .join('\n')

    sendMsg(chatId, 'No. 이름  chatId  pushBulletKey\n---\n' + message)
  }
}
