import { notiLog } from './biz/common'
import getTeleBot from './biz/get-tele-bot'
import { initWsList } from './biz/ws-manager'
import { initBotCommands } from './bot-commands'
import { initUiServer } from './ui/server'

const teleBot = getTeleBot()
initBotCommands(teleBot)
initWsList()
initUiServer()

notiLog(`Corn2P bot started 🚀🚀`, { level: 'info' })
