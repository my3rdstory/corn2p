import { getOrCreateAuthCode } from '../../biz/auth-code'
import { getAuthRecordByChatId, isChatIdAuthorized } from '../../biz/auth-store'
import { sendMsg } from '../../biz/get-tele-bot'
import { getDiscordConfig } from '../../biz/auth-config'

export default function auth(bot) {
  return async msg => {
    const chatId = msg.chat.id

    let requirement
    try {
      requirement = getDiscordConfig()
    } catch (err: any) {
      await sendMsg(
        chatId,
        'Corn2P Discord 인증 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.',
      )
      return
    }

    const alreadyAuthorized = isChatIdAuthorized(
      chatId,
      requirement.requiredRoleId,
    )
    if (alreadyAuthorized) {
      const record = getAuthRecordByChatId(chatId)
      const code = getOrCreateAuthCode(chatId)
      const message = [
        '이미 Corn2P Discord 인증이 완료된 계정입니다 ✅',
        record ? `- Discord 사용자: ${record.discordUsername}` : undefined,
        `- 확인된 역할: ${requirement.requiredRoleName}`,
        '',
        '다시 인증하려면 Discord에서 아래 명령을 실행해 주세요.',
      ]
        .filter(Boolean)
        .join('\n')
      await sendMsg(chatId, message)
      await sendMsg(chatId, `/auth ${code}`)
      return
    }

    const code = getOrCreateAuthCode(chatId)
    await sendMsg(
      chatId,
      [
        `Corn2P를 이용하려면 Discord '${requirement.requiredRoleName}' 역할 인증이 필요합니다.`,
        '인증 절차:',
        '1. Corn2P Discord 서버에서 인증 역할을 먼저 부여받고',
        '2. Discord에서 아래 슬래시 명령을 실행하세요.',
        '',
        '명령을 실행하면 Corn2P 봇이 텔레그램으로 인증 완료 메시지를 보내드립니다.',
      ].join('\n'),
    )
    await sendMsg(chatId, `/auth ${code}`)
  }
}
