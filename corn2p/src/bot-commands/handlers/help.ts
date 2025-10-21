import { sendMsg } from '../../biz/get-tele-bot'

export default function help(bot) {
  return async (msg, match) => {
    const chatId = msg.chat.id

    sendMsg(
      chatId,
      `I am p2phelper bot 🤖\n---\n👉 이용가이드 https://telegra.ph/p2pbtc-08-21\n👉 명령어가이드 https://telegra.ph/p2p-command-08-21`,
    )
  }
}
