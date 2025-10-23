import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { isDev } from './config'

const AUTH_DB_PATH = join(
  process.cwd(),
  isDev ? 'auth-db-dev.json' : 'auth-db.json',
)

type AuthRecord = {
  chatId: number
  discordUserId: string
  discordUsername: string
  discordDiscriminator?: string
  verifiedRoleId: string
  verifiedRoleName: string
  verifiedAt: string
}

type AuthDB = {
  users: AuthRecord[]
}

const loadDb = (): AuthDB => {
  if (existsSync(AUTH_DB_PATH)) {
    const raw = readFileSync(AUTH_DB_PATH, 'utf8')
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.users)) {
        return parsed
      }
    } catch {
      // ignore parse error, fallback to new db
    }
  }
  return { users: [] }
}

let db = loadDb()

const persist = () => {
  writeFileSync(AUTH_DB_PATH, JSON.stringify(db, null, 2))
}

export const upsertAuthRecord = (record: AuthRecord) => {
  const idx = db.users.findIndex(user => user.chatId === record.chatId)
  if (idx >= 0) {
    db.users[idx] = record
  } else {
    db.users.push(record)
  }
  persist()
}

export const getAuthRecordByChatId = (chatId: number) =>
  db.users.find(user => user.chatId === chatId)

export const isChatIdAuthorized = (chatId: number, roleId: string) => {
  const record = getAuthRecordByChatId(chatId)
  if (!record) return false
  return record.verifiedRoleId === roleId
}

export const getAuthDbPath = () => AUTH_DB_PATH
