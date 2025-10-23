import { isChatIdAuthorized } from '../../biz/auth-store'
import { sendMsg } from '../../biz/get-tele-bot'
import {
  createDiscordAuthLink,
  getRequiredRoleInfo,
  isAuthFeatureEnabled,
} from '../../ui/auth-server'

const buildAuthMessage = (roleName: string, link?: string | null) => {
  const lines = [
    `Corn2P를 이용하려면 Discord '${roleName}' 역할 인증이 필요합니다.`,
    `디스코드에서 해당 역할을 받은 뒤, 아래 인증 링크를 통해 /auth 명령을 실행해 주세요.`,
  ]
  if (link) {
    lines.push('', link)
  }
  return lines.join('\n')
}

export const withAuth =
  handler =>
  bot => {
    const wrapped = handler(bot)
    return async (msg, match) => {
      const chatId = msg.chat.id

      if (!isAuthFeatureEnabled()) {
        await sendMsg(
          chatId,
          'Corn2P Discord 인증이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.',
        )
        return
      }

      const requirement = getRequiredRoleInfo()
      if (!requirement) {
        await sendMsg(
          chatId,
          'Corn2P Discord 인증 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        )
        return
      }

      const isAuthorized = isChatIdAuthorized(chatId, requirement.roleId)
      if (!isAuthorized) {
        const link = createDiscordAuthLink(chatId)
        await sendMsg(chatId, buildAuthMessage(requirement.roleName, link))
        return
      }

      return wrapped(msg, match)
    }
  }
