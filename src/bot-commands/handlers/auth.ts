import { getAuthRecordByChatId, isChatIdAuthorized } from '../../biz/auth-store'
import { sendMsg } from '../../biz/get-tele-bot'
import {
  createDiscordAuthLink,
  getRequiredRoleInfo,
  isAuthFeatureEnabled,
} from '../../ui/auth-server'

export default function auth(bot) {
  return async msg => {
    const chatId = msg.chat.id

    if (!isAuthFeatureEnabled()) {
      await sendMsg(
        chatId,
        'Corn2P Discord 인증이 아직 활성화되지 않았습니다. 관리자에게 설정을 요청해 주세요.',
      )
      return
    }

    const requirement = getRequiredRoleInfo()
    if (!requirement) {
      await sendMsg(
        chatId,
        'Corn2P Discord 인증 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      return
    }

    const link = createDiscordAuthLink(chatId)
    if (!link) {
      await sendMsg(
        chatId,
        '인증 링크를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      return
    }

    const alreadyAuthorized = isChatIdAuthorized(chatId, requirement.roleId)
    if (alreadyAuthorized) {
      const record = getAuthRecordByChatId(chatId)
      await sendMsg(
        chatId,
        [
          '이미 Corn2P Discord 인증이 완료된 계정입니다 ✅',
          record
            ? `- Discord 사용자: ${record.discordUsername}`
            : undefined,
          `- 확인된 역할: ${requirement.roleName}`,
          '',
          '다시 인증하려면 아래 링크를 눌러 진행하세요.',
          link,
        ]
          .filter(Boolean)
          .join('\n'),
      )
      return
    }

    await sendMsg(
      chatId,
      [
        `Corn2P를 이용하려면 Discord '${requirement.roleName}' 역할 인증이 필요합니다.`,
        '인증 절차:',
        '1. Discord Corn2P 서버에서 인증 역할을 받은 뒤',
        '2. 아래 링크를 눌러 Discord 계정으로 로그인하고 역할을 확인해 주세요.',
        '3. 인증이 완료되면 텔레그램에서 안내 메시지를 받게 됩니다.',
        '',
        link,
      ].join('\n'),
    )
  }
}
