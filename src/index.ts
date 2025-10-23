import { notiLog } from './biz/common'
import getTeleBot from './biz/get-tele-bot'
import { initWsList } from './biz/ws-manager'
import { initBotCommands } from './bot-commands'

const teleBot = getTeleBot()
initBotCommands(teleBot)
initWsList()

notiLog(`p2phelper bot started 🚀🚀`, { level: 'info' })
