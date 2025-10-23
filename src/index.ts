import { notiLog } from './biz/common'
import getTeleBot from './biz/get-tele-bot'
import { initWsList } from './biz/ws-manager'
import { initBotCommands } from './bot-commands'
import { initDiscordBot } from './discord/bot'

const teleBot = getTeleBot()
initBotCommands(teleBot)
initWsList()
initDiscordBot()

notiLog(`Corn2P bot started 🚀🚀`, { level: 'info' })
