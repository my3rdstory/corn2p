const required = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(
      `[auth-config] Missing required environment variable: ${name}`,
    )
  }
  return value
}

export const getDiscordConfig = () => ({
  clientId: required(process.env.DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID'),
  clientSecret: required(
    process.env.DISCORD_CLIENT_SECRET,
    'DISCORD_CLIENT_SECRET',
  ),
  redirectUri: required(
    process.env.DISCORD_REDIRECT_URI,
    'DISCORD_REDIRECT_URI',
  ),
  guildId: required(process.env.DISCORD_GUILD_ID, 'DISCORD_GUILD_ID'),
  requiredRoleId: required(
    process.env.DISCORD_REQUIRED_ROLE_ID,
    'DISCORD_REQUIRED_ROLE_ID',
  ),
  requiredRoleName: process.env.DISCORD_REQUIRED_ROLE_NAME ?? '풀노더',
})

export const getAuthServerConfig = () => {
  const port = Number(process.env.AUTH_SERVER_PORT ?? '3000')
  if (Number.isNaN(port)) {
    throw new Error(
      `[auth-config] AUTH_SERVER_PORT should be a number, received: ${process.env.AUTH_SERVER_PORT}`,
    )
  }
  return {
    port,
    publicBaseUrl: required(
      process.env.AUTH_SERVER_PUBLIC_URL,
      'AUTH_SERVER_PUBLIC_URL',
    ),
  }
}
