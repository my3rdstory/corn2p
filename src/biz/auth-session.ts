import { randomBytes } from 'crypto'

type SessionState = {
  chatId: number
  createdAt: number
}

const sessionStore = new Map<string, SessionState>()
const SESSION_TTL_MS = 10 * 60 * 1000 // 10 minutes

const pruneExpired = () => {
  const now = Date.now()
  for (const [state, { createdAt }] of sessionStore.entries()) {
    if (now - createdAt > SESSION_TTL_MS) {
      sessionStore.delete(state)
    }
  }
}

export const createAuthState = (chatId: number) => {
  pruneExpired()
  const state = randomBytes(24).toString('hex')
  sessionStore.set(state, { chatId, createdAt: Date.now() })
  return state
}

export const peekAuthState = (state: string) => {
  pruneExpired()
  return sessionStore.get(state)
}

export const consumeAuthState = (state: string) => {
  pruneExpired()
  const value = sessionStore.get(state)
  if (value) {
    sessionStore.delete(state)
  }
  return value
}
