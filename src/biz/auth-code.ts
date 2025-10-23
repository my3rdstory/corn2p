type PendingAuth = {
  chatId: number
  code: string
  createdAt: number
}

const CODE_TTL_MS = 10 * 60 * 1000 // 10분
const byCode = new Map<string, PendingAuth>()
const byChatId = new Map<number, PendingAuth>()

const prune = () => {
  const now = Date.now()
  for (const [code, pending] of byCode.entries()) {
    if (now - pending.createdAt > CODE_TTL_MS) {
      byCode.delete(code)
      byChatId.delete(pending.chatId)
    }
  }
}

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const getOrCreateAuthCode = (chatId: number) => {
  prune()
  const existing = byChatId.get(chatId)
  if (existing) {
    return existing.code
  }

  let code = generateCode()
  while (byCode.has(code)) {
    code = generateCode()
  }

  const pending: PendingAuth = {
    chatId,
    code,
    createdAt: Date.now(),
  }

  byCode.set(code, pending)
  byChatId.set(chatId, pending)

  return code
}

export const getPendingByCode = (code: string) => {
  prune()
  return byCode.get(code)
}

export const clearAuthCodeByCode = (code: string) => {
  const pending = byCode.get(code)
  if (!pending) {
    return
  }
  byCode.delete(code)
  byChatId.delete(pending.chatId)
}

export const clearAuthCodeByChatId = (chatId: number) => {
  const pending = byChatId.get(chatId)
  if (!pending) {
    return
  }
  byChatId.delete(chatId)
  byCode.delete(pending.code)
}
