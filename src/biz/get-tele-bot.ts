import TelegramBot from 'node-telegram-bot-api'
import { sequentialInvoke } from '../utils/lib'
import logger from '../utils/logger'

logger.info({ teleBot: '@' + process.env.TELEGRAM_BOT_USERNANE })
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: true,
  request: {
    // https://github.com/yagop/node-telegram-bot-api/issues/1136#issuecomment-2033356505
    url: 'https://api.telegram.org',
    agentOptions: {
      keepAlive: true,
      family: 4,
    },
  },
})

export default function getTeleBot() {
  return bot
}

export const sendMsg = sequentialInvoke(function sendMessage(
  chatId: number,
  _message: string,
  option?: any,
) {
  if (!chatId || !_message) {
    return Promise.resolve()
  }
  // maxLength of message is 4096
  // https://developers.cm.com/messaging/docs/telegram
  const message =
    _message.length > 4090 ? _message.slice(0, 4090) + '...' : _message

  return bot
    .sendMessage(chatId, message, option)
    .catch(err => logger.error(`[sendMsg] ${err.message}`))
},
5) // 순서대로 호출되는 것만 보장된다면 사실상 delay 는 없어도 되는 상황인 것으로 보임
