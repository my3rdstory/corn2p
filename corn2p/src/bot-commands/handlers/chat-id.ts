import { sendMsg } from '../../biz/get-tele-bot'

export default function chatId(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id
    sendMsg(chatId, `This chat's ID is: ${chatId}`)
  }
}
