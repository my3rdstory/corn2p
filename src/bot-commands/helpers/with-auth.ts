import { getOrCreateAuthCode } from '../../biz/auth-code'
import { isChatIdAuthorized } from '../../biz/auth-store'
import { sendMsg } from '../../biz/get-tele-bot'
import { getDiscordConfig } from '../../biz/auth-config'

export const withAuth =
  handler =>
  bot => {
    const wrapped = handler(bot)
    return async (msg, match) => {
      const chatId = msg.chat.id

      let requirement
      try {
        requirement = getDiscordConfig()
      } catch (err: any) {
        await sendMsg(
          chatId,
          'Corn2P Discord 인증 설정이 완료되지 않아 명령을 실행할 수 없습니다. 관리자에게 문의해 주세요.',
        )
        return
      }

      const isAuthorized = isChatIdAuthorized(chatId, requirement.requiredRoleId)
      if (!isAuthorized) {
        const code = getOrCreateAuthCode(chatId)
        await sendMsg(
          chatId,
          [
            `Corn2P를 이용하려면 Discord '${requirement.requiredRoleName}' 역할 인증이 필요합니다.`,
            '아래 절차를 따라 주세요:',
            '1. Corn2P Discord 서버에서 역할을 부여받고',
            '2. Discord에서 아래 명령을 실행해 주세요.',
            '',
            '인증이 완료되면 이 메시지는 더 이상 표시되지 않습니다.',
          ].join('\n'),
        )
        await sendMsg(chatId, `/auth ${code}`)
        return
      }

      return wrapped(msg, match)
    }
  }
