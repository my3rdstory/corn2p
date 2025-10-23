import axios from 'axios'
import express from 'express'
import { getAuthServerConfig, getDiscordConfig } from '../biz/auth-config'
import {
  consumeAuthState,
  createAuthState,
  peekAuthState,
} from '../biz/auth-session'
import { upsertAuthRecord } from '../biz/auth-store'
import { sendMsg } from '../biz/get-tele-bot'
import logger from '../utils/logger'

const DISCORD_OAUTH_AUTHORIZE = 'https://discord.com/api/oauth2/authorize'
const DISCORD_OAUTH_TOKEN = 'https://discord.com/api/oauth2/token'
const DISCORD_API_BASE = 'https://discord.com/api/v10'
const DISCORD_SCOPE = 'identify guilds.members.read'

type DiscordUser = {
  id: string
  username: string
  global_name?: string
  discriminator?: string
}

type DiscordGuildMember = {
  roles: string[]
  nick?: string
}

let serverStarted = false
let cachedConfigs:
  | { discord: ReturnType<typeof getDiscordConfig>; server: ReturnType<typeof getAuthServerConfig> }
  | null = null
let configError: Error | null = null

const loadConfigs = () => {
  if (!cachedConfigs && !configError) {
    try {
      cachedConfigs = {
        discord: getDiscordConfig(),
        server: getAuthServerConfig(),
      }
    } catch (err) {
      configError = err as Error
      logger.error(`[auth-server] ${configError.message}`)
    }
  }
  return cachedConfigs
}

export const isAuthFeatureEnabled = () => Boolean(loadConfigs())

export const getRequiredRoleInfo = () => {
  const configs = loadConfigs()
  if (!configs) return null
  return {
    roleId: configs.discord.requiredRoleId,
    roleName: configs.discord.requiredRoleName,
  }
}

export const createDiscordAuthLink = (chatId: number) => {
  const configs = loadConfigs()
  if (!configs) return null
  const { server } = configs
  const state = createAuthState(chatId)
  return `${server.publicBaseUrl.replace(/\/$/, '')}/auth/discord?state=${state}`
}

const buildAuthorizeUrl = (state: string, redirectUri: string, clientId: string) => {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: DISCORD_SCOPE,
    redirect_uri: redirectUri,
    state,
    prompt: 'consent',
  })
  return `${DISCORD_OAUTH_AUTHORIZE}?${params.toString()}`
}

const exchangeToken = async (
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
) => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })

  const response = await axios.post(DISCORD_OAUTH_TOKEN, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  return response.data as {
    access_token: string
    token_type: string
  }
}

const fetchDiscordUser = async (token: string, tokenType: string) => {
  const response = await axios.get<DiscordUser>(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `${tokenType} ${token}`,
    },
  })
  return response.data
}

const fetchGuildMember = async (
  token: string,
  tokenType: string,
  guildId: string,
) => {
  const response = await axios.get<DiscordGuildMember>(
    `${DISCORD_API_BASE}/users/@me/guilds/${guildId}/member`,
    {
      headers: {
        Authorization: `${tokenType} ${token}`,
      },
    },
  )
  return response.data
}

const renderHtml = (opts: { title: string; message: string }) =>
  `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${opts.title}</title>
  <style>
    body { font-family: sans-serif; padding: 40px; background: #fafafa; color: #333; }
    main { max-width: 480px; margin: 0 auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.08); }
    h1 { font-size: 1.6rem; margin-bottom: 1rem; }
    p { line-height: 1.6; white-space: pre-line; }
  </style>
</head>
<body>
  <main>
    <h1>${opts.title}</h1>
    <p>${opts.message}</p>
  </main>
</body>
</html>`

const sendInstructionMessage = (chatId: number, roleName: string) =>
  sendMsg(
    chatId,
    [
      `Corn2P를 이용하려면 Discord 서버에서 '${roleName}' 역할 인증이 필요합니다.`,
      `1. Corn2P Discord 서버에서 '${roleName}' 역할을 받은 뒤`,
      `2. 텔레그램에서 /auth 명령을 다시 실행해 주세요.`,
    ].join('\n'),
  )

export const startAuthServer = () => {
  if (serverStarted) return
  const configs = loadConfigs()
  if (!configs) {
    logger.warn(
      '[auth-server] Discord OAuth 환경변수가 설정되지 않아 인증 서버를 시작하지 않습니다.',
    )
    return
  }

  const { discord, server } = configs

  const app = express()

  app.get('/auth/discord', (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const state = req.query.state
    if (typeof state !== 'string') {
      res.status(400).send(renderHtml({ title: 'Corn2P 인증', message: '잘못된 요청입니다. 텔레그램에서 /auth 명령을 다시 실행해 주세요.' }))
      return
    }
    const session = peekAuthState(state)
    if (!session) {
      res
        .status(410)
        .send(
          renderHtml({
            title: '세션 만료',
            message: '인증 세션이 만료되었습니다. 텔레그램에서 /auth 명령을 다시 실행해 주세요.',
          }),
        )
      return
    }
    const authorizeUrl = buildAuthorizeUrl(state, discord.redirectUri, discord.clientId)
    res.redirect(authorizeUrl)
  })

  app.get('/auth/discord/callback', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const { code, state, error } = req.query

    if (typeof error === 'string') {
      const session = state && typeof state === 'string' ? consumeAuthState(state) : undefined
      if (session) {
        sendInstructionMessage(session.chatId, discord.requiredRoleName)
      }
      res
        .status(400)
        .send(
          renderHtml({
            title: '인증이 취소되었습니다',
            message: 'Discord 인증이 취소되었습니다. 텔레그램에서 /auth 명령으로 다시 시도해 주세요.',
          }),
        )
      return
    }

    if (typeof code !== 'string' || typeof state !== 'string') {
      res
        .status(400)
        .send(
          renderHtml({
            title: 'Corn2P 인증 실패',
            message: '요청 정보가 올바르지 않습니다. 텔레그램에서 /auth 명령을 다시 실행해 주세요.',
          }),
        )
      return
    }

    const session = consumeAuthState(state)
    if (!session) {
      res
        .status(410)
        .send(
          renderHtml({
            title: '세션 만료',
            message: '인증 세션이 만료되었습니다. 텔레그램에서 /auth 명령을 다시 실행해 주세요.',
          }),
        )
      return
    }

    try {
      const tokenInfo = await exchangeToken(
        code,
        discord.redirectUri,
        discord.clientId,
        discord.clientSecret,
      )

      const user = await fetchDiscordUser(
        tokenInfo.access_token,
        tokenInfo.token_type,
      )

      const guildMember = await fetchGuildMember(
        tokenInfo.access_token,
        tokenInfo.token_type,
        discord.guildId,
      )

      const hasRole = guildMember.roles.includes(discord.requiredRoleId)

      if (!hasRole) {
        await sendInstructionMessage(session.chatId, discord.requiredRoleName)
        res
          .status(403)
          .send(
            renderHtml({
              title: 'Corn2P 역할 미확인',
              message:
                `'${discord.requiredRoleName}' 역할이 확인되지 않았습니다.\nDiscord에서 역할을 부여받은 뒤 텔레그램에서 /auth 명령으로 다시 인증해 주세요.`,
            }),
          )
        return
      }

      upsertAuthRecord({
        chatId: session.chatId,
        discordUserId: user.id,
        discordUsername: user.global_name ?? user.username,
        discordDiscriminator: user.discriminator,
        verifiedRoleId: discord.requiredRoleId,
        verifiedRoleName: discord.requiredRoleName,
        verifiedAt: new Date().toISOString(),
      })

      await sendMsg(
        session.chatId,
        [
          'Corn2P Discord 인증이 완료되었습니다 ✅',
          `- Discord 사용자: ${user.global_name ?? user.username}`,
          `- 확인된 역할: ${discord.requiredRoleName}`,
        ].join('\n'),
      )

      res.send(
        renderHtml({
          title: '인증 완료',
          message:
            'Corn2P Discord 인증이 완료되었습니다. 텔레그램으로 돌아가 Corn2P 명령을 사용할 수 있습니다.',
        }),
      )
    } catch (err: any) {
      logger.error(
        `[auth-server] Discord OAuth 처리 중 오류: ${err.message}`,
      )
      await sendMsg(
        session.chatId,
        'Corn2P Discord 인증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      )
      res
        .status(500)
        .send(
          renderHtml({
            title: 'Corn2P 인증 오류',
            message: 'Discord 인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          }),
        )
    }
  })

  app.get('/auth/status/ping', (_, res) => {
    res.json({ ok: true, time: Date.now() })
  })

  app.listen(server.port, () => {
    serverStarted = true
    logger.info(
      `[auth-server] Discord OAuth 서버가 포트 ${server.port}에서 시작되었습니다.`,
    )
  })
}
