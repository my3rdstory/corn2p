import { notiLog } from './biz/common'
import getTeleBot from './biz/get-tele-bot'
import { initWsList } from './biz/ws-manager'
import { initBotCommands } from './bot-commands'
import { startAuthServer } from './ui/auth-server'

const teleBot = getTeleBot()
initBotCommands(teleBot)
initWsList()
startAuthServer()

notiLog(`Corn2P bot started 🚀🚀`, { level: 'info' })
