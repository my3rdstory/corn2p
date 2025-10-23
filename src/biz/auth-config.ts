const required = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(
      `[auth-config] Missing required environment variable: ${name}`,
    )
  }
  return value
}

export const getDiscordConfig = () => ({
  botToken: required(process.env.DISCORD_BOT_TOKEN, 'DISCORD_BOT_TOKEN'),
  clientId: required(process.env.DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID'),
  guildId: required(process.env.DISCORD_GUILD_ID, 'DISCORD_GUILD_ID'),
  requiredRoleId: required(
    process.env.DISCORD_REQUIRED_ROLE_ID,
    'DISCORD_REQUIRED_ROLE_ID',
  ),
  requiredRoleName: process.env.DISCORD_REQUIRED_ROLE_NAME ?? '풀노더',
})
