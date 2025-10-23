import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js'
import { getDiscordConfig } from '../biz/auth-config'
import {
  clearAuthCodeByCode,
  getPendingByCode,
} from '../biz/auth-code'
import { upsertAuthRecord } from '../biz/auth-store'
import { sendMsg } from '../biz/get-tele-bot'
import logger from '../utils/logger'

let initialized = false

const buildCommandsPayload = () => {
  const authCommand = new SlashCommandBuilder()
    .setName('auth')
    .setDescription('Corn2P 텔레그램 계정 인증')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('텔레그램에서 받은 인증 코드 (6자리 숫자)')
        .setRequired(true),
    )

  return [authCommand.toJSON()]
}

const registerCommands = async (
  token: string,
  clientId: string,
  guildId: string,
) => {
  const rest = new REST({ version: '10' }).setToken(token)
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: buildCommandsPayload(),
  })
  logger.info('[discord] Slash 명령 등록 완료')
}

export const initDiscordBot = () => {
  if (initialized) {
    return
  }

  let config
  try {
    config = getDiscordConfig()
  } catch (err: any) {
    logger.warn(
      `[discord] 환경변수 누락으로 Discord 봇을 시작하지 않습니다: ${err.message}`,
    )
    return
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.GuildMember],
  })

  client.once(Events.ClientReady, readyClient => {
    logger.info(`[discord] 봇 로그인 완료: ${readyClient.user.tag}`)
    registerCommands(config.botToken, config.clientId, config.guildId).catch(
      err => {
        logger.error(
          `[discord] Slash 명령 등록 실패: ${(err as Error).message}`,
        )
      },
    )
  })

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) {
      return
    }
    if (interaction.commandName !== 'auth') {
      return
    }

    const code = interaction.options.getString('code', true).trim()
    const pending = getPendingByCode(code)

    if (!pending) {
      await interaction.reply({
        content:
          '인증 코드가 유효하지 않거나 만료되었습니다. 텔레그램에서 `/auth` 명령을 다시 실행해 주세요.',
        ephemeral: true,
      })
      return
    }

    if (!interaction.guild || interaction.guild.id !== config.guildId) {
      await interaction.reply({
        content: 'Corn2P Discord 서버에서만 인증할 수 있습니다.',
        ephemeral: true,
      })
      return
    }

    try {
      const member = await interaction.guild.members.fetch(
        interaction.user.id,
      )

      const hasRole = member.roles.cache.has(config.requiredRoleId)
      if (!hasRole) {
        await interaction.reply({
          content: `'${config.requiredRoleName}' 역할이 확인되지 않았습니다. 역할을 부여받은 뒤 다시 시도해 주세요.`,
          ephemeral: true,
        })
        return
      }

      clearAuthCodeByCode(code)

      upsertAuthRecord({
        chatId: pending.chatId,
        discordUserId: member.user.id,
        discordUsername: member.user.globalName ?? member.user.username,
        discordDiscriminator: member.user.discriminator,
        verifiedRoleId: config.requiredRoleId,
        verifiedRoleName: config.requiredRoleName,
        verifiedAt: new Date().toISOString(),
      })

      await interaction.reply({
        content:
          'Corn2P 인증이 완료되었습니다! 텔레그램 Corn2P 봇에서 안내 메시지를 확인해 주세요.',
        ephemeral: true,
      })

      await sendMsg(
        pending.chatId,
        [
          'Corn2P Discord 인증이 완료되었습니다 ✅',
          `- Discord 사용자: ${member.user.globalName ?? member.user.username}`,
          `- 확인된 역할: ${config.requiredRoleName}`,
        ].join('\n'),
      )
    } catch (err: any) {
      logger.error(
        `[discord] 인증 처리 중 오류: ${err.message}`,
      )
      await interaction.reply({
        content: '인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        ephemeral: true,
      })
    }
  })

  client.login(config.botToken).catch(err => {
    logger.error(`[discord] 봇 로그인 실패: ${(err as Error).message}`)
  })

  initialized = true
}
