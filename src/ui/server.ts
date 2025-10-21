import { createServer, IncomingMessage, ServerResponse } from 'http'
import { parse as parseUrl } from 'url'
import { parse as parseQuery } from 'querystring'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import logger from '../utils/logger'

type ConfigRecord = Record<string, string>

const dataDir = process.env.CORN2P_DATA_DIR ?? '.'
const configPath = join(dataDir, 'config.json')
const envPath = join(dataDir, '.env')
const port = Number(process.env.CORN2P_UI_PORT ?? 2121)
const envMode = process.env.CORN2P_ENV ?? process.env.NODE_ENV
const defaultDbName = envMode && envMode !== 'production' ? 'db-dev.json' : 'db.json'
const dbPath = join(dataDir, process.env.CORN2P_DB_FILE ?? defaultDbName)

const CONFIG_KEYS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNANE',
  'ENC_SECRET',
  'CORN2P_CHAT_ID_HISTORY',
  'CORN2P_CHAT_ID_ADMIN',
  'CORN2P_CHAT_ID_PUSH',
  'CORN2P_CHAT_ID_LOG',
  'CORN2P_CHAT_ID_ERROR',
] as const

const ensureDataDir = () => {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
}

const readConfig = (): ConfigRecord => {
  try {
    if (!existsSync(configPath)) {
      return {}
    }
    const raw = readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(raw)
    return Object.keys(parsed).reduce<ConfigRecord>((acc, key) => {
      const value = parsed[key]
      if (typeof value === 'string') {
        acc[key] = value
      } else if (value != null) {
        acc[key] = String(value)
      }
      return acc
    }, {})
  } catch (error) {
    logger.error('[Corn2P UI] Failed to read config.json', error)
    return {}
  }
}

const writeConfig = (config: ConfigRecord) => {
  ensureDataDir()
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

const writeEnv = (config: ConfigRecord) => {
  const lines = Object.entries(config)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${key}=${value.replace(/\n/g, '\\n')}`)

  writeFileSync(envPath, lines.join('\n') + (lines.length ? '\n' : ''))
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderEncSecretInput = (value: string) => {
  const escaped = escapeHtml(value)
  return `<input id="enc-secret-input" class="input" type="text" name="ENC_SECRET" placeholder="랜덤 문자열" required value="${escaped}">`
}

const readDbRaw = (): string => {
  try {
    if (!existsSync(dbPath)) {
      return JSON.stringify({ sellers: [], buyers: [], trades: [] }, null, 2)
    }
    return readFileSync(dbPath, 'utf8')
  } catch (error) {
    logger.error('[Corn2P UI] Failed to read db.json', error)
    return JSON.stringify({ error: 'Failed to read database file' }, null, 2)
  }
}

const renderDbInitial = () => `
  <div class="box">
    <h2 class="title is-5">데이터베이스 관리</h2>
    <p class="help mb-4">corn2p의 상태 데이터가 저장된 db.json을 보기/편집할 수 있습니다.</p>
    <div class="buttons">
      <button class="button is-danger is-light" hx-get="/partials/db-warning" hx-target="#db-editor" hx-swap="innerHTML">
        DB 편집하기
      </button>
      <a class="button is-link is-light" href="/api/db" target="_blank" rel="noreferrer">JSON 새 창에서 보기</a>
    </div>
  </div>
`

const renderDbWarning = () => `
  <div class="box has-background-warning-light">
    <h2 class="title is-5 has-text-danger">⚠️ DB 직접 편집 주의</h2>
    <p class="content">
      db.json에는 판매자/구매자/거래 정보가 저장되어 있습니다. 내용을 잘못 변경하면 시스템이 중단되거나 자금 손실 등 심각한 오류가 발생할 수 있습니다.
      <br/>정말로 내용을 이해하고 있을 때만 편집을 진행하세요.
    </p>
    <div class="buttons">
      <button class="button is-danger" hx-get="/partials/db-editor" hx-target="#db-editor" hx-swap="innerHTML">위험을 이해했으며 계속합니다</button>
      <button class="button" hx-get="/partials/db-initial" hx-target="#db-editor" hx-swap="innerHTML">취소</button>
    </div>
  </div>
`

const renderDbEditor = () => {
  const dbContent = escapeHtml(readDbRaw())
  return `
    <div class="box">
      <h2 class="title is-5">db.json 편집</h2>
      <article class="message is-danger">
        <div class="message-body">
          JSON 구조를 정확히 이해한 뒤 수정하세요. 잘못된 JSON은 저장되지 않습니다.
        </div>
      </article>
      <div id="db-editor-message"></div>
      <form hx-post="/api/db" hx-target="#db-editor-message" hx-swap="innerHTML" hx-encoding="application/x-www-form-urlencoded">
        <div class="field">
          <label class="label" for="db-json">db.json 내용</label>
          <div class="control">
            <textarea id="db-json" class="textarea is-family-monospace" name="dbJson" rows="20" spellcheck="false">${dbContent}</textarea>
          </div>
          <p class="help">전체 내용을 복사/붙여넣기 하거나 수정 후 저장하세요.</p>
        </div>
        <div class="buttons">
          <button class="button is-primary" type="submit">저장</button>
          <button class="button is-light" type="button" hx-get="/partials/db-editor" hx-target="#db-editor" hx-swap="innerHTML">원본 다시 불러오기</button>
          <button class="button" type="button" hx-get="/partials/db-initial" hx-target="#db-editor" hx-swap="innerHTML">닫기</button>
        </div>
      </form>
    </div>
  `
}

const renderPage = (config: ConfigRecord) => {
  const getValue = (key: string) => escapeHtml(config[key] ?? '')
  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Corn2P 설정</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">
    <script src="https://unpkg.com/htmx.org@1.9.12"></script>
  </head>
  <body>
    <section class="section">
      <div class="container">
        <h1 class="title is-3">Corn2P 설정</h1>
        <p class="subtitle is-6">Umbrel에서 입력한 값들을 확인하고 업데이트할 수 있습니다.</p>

        <div id="form-message"></div>

        <form id="settings-form" hx-post="/api/config" hx-target="#form-message" hx-swap="innerHTML">
          <div class="box">
            <h2 class="title is-5">텔레그램 연동</h2>

            <div class="field">
              <label class="label" for="telegram-token">텔레그램 봇 토큰</label>
              <div class="control">
                <input id="telegram-token" class="input" type="text" name="TELEGRAM_BOT_TOKEN" placeholder="123456:ABCDEF" required value="${getValue(
                  'TELEGRAM_BOT_TOKEN',
                )}">
              </div>
            </div>

            <div class="field">
              <label class="label" for="telegram-username">텔레그램 봇 사용자 이름</label>
              <div class="control">
                <input id="telegram-username" class="input" type="text" name="TELEGRAM_BOT_USERNANE" placeholder="corn2p_bot" required value="${getValue(
                  'TELEGRAM_BOT_USERNANE',
                )}">
              </div>
              <p class="help">앞의 @ 없이 입력하세요.</p>
            </div>
          </div>

          <div class="box">
            <h2 class="title is-5">암호화 & PushBullet</h2>

            <div class="field">
              <label class="label" for="enc-secret-input">암호화 시크릿</label>
              <div class="field has-addons">
                <div class="control is-expanded" id="enc-secret-container">
                  ${renderEncSecretInput(config['ENC_SECRET'] ?? '')}
                </div>
                <div class="control">
                  <button class="button is-link is-light" type="button" hx-get="/api/generate-secret" hx-target="#enc-secret-input" hx-swap="outerHTML">
                    자동 생성
                  </button>
                </div>
              </div>
              <p class="help">판매자 API Key와 PushBullet Key를 암호화하는 데 사용됩니다.</p>
            </div>
          </div>

          <div class="box">
            <h2 class="title is-5">관리자 알림 채널</h2>
            <p class="help mb-3">각 텔레그램 채팅방의 chat_id를 숫자로 입력하세요.</p>

            <div class="field">
              <label class="label" for="chat-history">거래 내역 채널 chat_id</label>
              <div class="control">
                <input id="chat-history" class="input" type="text" name="CORN2P_CHAT_ID_HISTORY" placeholder="0" value="${getValue(
                  'CORN2P_CHAT_ID_HISTORY',
                )}">
              </div>
            </div>

            <div class="field">
              <label class="label" for="chat-admin">관리자 채널 chat_id</label>
              <div class="control">
                <input id="chat-admin" class="input" type="text" name="CORN2P_CHAT_ID_ADMIN" placeholder="0" value="${getValue(
                  'CORN2P_CHAT_ID_ADMIN',
                )}">
              </div>
            </div>

            <div class="field">
              <label class="label" for="chat-push">PushBullet 채널 chat_id</label>
              <div class="control">
                <input id="chat-push" class="input" type="text" name="CORN2P_CHAT_ID_PUSH" placeholder="0" value="${getValue(
                  'CORN2P_CHAT_ID_PUSH',
                )}">
              </div>
            </div>

            <div class="field">
              <label class="label" for="chat-log">로그 채널 chat_id</label>
              <div class="control">
                <input id="chat-log" class="input" type="text" name="CORN2P_CHAT_ID_LOG" placeholder="0" value="${getValue(
                  'CORN2P_CHAT_ID_LOG',
                )}">
              </div>
            </div>

            <div class="field">
              <label class="label" for="chat-error">에러 채널 chat_id</label>
              <div class="control">
                <input id="chat-error" class="input" type="text" name="CORN2P_CHAT_ID_ERROR" placeholder="0" value="${getValue(
                  'CORN2P_CHAT_ID_ERROR',
                )}">
              </div>
            </div>
          </div>

          <div class="field is-grouped">
            <div class="control">
              <button class="button is-primary" type="submit">저장</button>
            </div>
            <div class="control">
              <a class="button is-light" href="/api/config" target="_blank" rel="noreferrer">설정 JSON 보기</a>
            </div>
          </div>
        </form>
      </div>
      <div id="db-editor">
        ${renderDbInitial()}
      </div>
    </section>
  </body>
</html>`
}

const sendHtml = (res: ServerResponse, content: string, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(content)
}

const sendJson = (res: ServerResponse, data: unknown, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data, null, 2))
}

const handleGenerateSecret = (res: ServerResponse) => {
  const secret = crypto.randomBytes(32).toString('hex')
  sendHtml(res, renderEncSecretInput(secret))
}

const collectFormData = (req: IncomingMessage) =>
  new Promise<Record<string, any>>((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      resolve(parseQuery(body))
    })
    req.on('error', reject)
  })

const handleDbPost = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const form = await collectFormData(req)
    const raw = form.dbJson
    const content =
      typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
        ? raw[raw.length - 1]
        : ''

    if (!content.trim()) {
      sendHtml(
        res,
        '<div class="notification is-warning">내용이 비어 있어서 저장하지 않았습니다.</div>',
      )
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch (error) {
      sendHtml(
        res,
        '<div class="notification is-danger">유효한 JSON 형식이 아닙니다. 저장에 실패했습니다.</div>',
        400,
      )
      return
    }

    ensureDataDir()
    writeFileSync(dbPath, JSON.stringify(parsed, null, 2))
    sendHtml(
      res,
      '<div class="notification is-success">db.json을 저장했습니다. Corn2P 앱을 재시작해 변경 사항을 적용하세요.</div>',
    )
  } catch (error) {
    logger.error('[Corn2P UI] Failed to save db.json', error)
    sendHtml(
      res,
      '<div class="notification is-danger">db.json 저장 중 오류가 발생했습니다. 로그를 확인해 주세요.</div>',
      500,
    )
  }
}

const handleConfigPost = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const current = readConfig()
    const form = await collectFormData(req)
    const updates: ConfigRecord = { ...current }

    CONFIG_KEYS.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(form, key)) {
        const raw = form[key]
        const value =
          typeof raw === 'string'
            ? raw.trim()
            : Array.isArray(raw)
            ? raw[raw.length - 1]
            : ''
        updates[key] = value
      }
    })

    writeConfig(updates)
    writeEnv(updates)

    sendHtml(
      res,
      '<div class="notification is-success">설정을 저장했습니다. 변경 사항을 적용하려면 Corn2P 앱을 재시작하세요.</div>',
    )
  } catch (error) {
    logger.error('[Corn2P UI] Failed to save config', error)
    sendHtml(
      res,
      '<div class="notification is-danger">설정 저장에 실패했습니다. 로그를 확인해 주세요.</div>',
      500,
    )
  }
}

const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
  const url = parseUrl(req.url ?? '/', true)

  if (req.method === 'GET' && url.pathname === '/') {
    const config = readConfig()
    sendHtml(res, renderPage(config))
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    sendJson(res, readConfig())
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/db') {
    try {
      const content = readDbRaw()
      const parsed = JSON.parse(content)
      sendJson(res, parsed)
    } catch (error) {
      logger.error('[Corn2P UI] Failed to parse db.json', error)
      sendHtml(
        res,
        '<div class="notification is-danger">db.json을 읽는 데 실패했습니다.</div>',
        500,
      )
    }
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/generate-secret') {
    handleGenerateSecret(res)
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/config') {
    await handleConfigPost(req, res)
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/db') {
    await handleDbPost(req, res)
    return
  }

  if (req.method === 'GET' && url.pathname === '/partials/db-warning') {
    sendHtml(res, renderDbWarning())
    return
  }

  if (req.method === 'GET' && url.pathname === '/partials/db-editor') {
    sendHtml(res, renderDbEditor())
    return
  }

  if (req.method === 'GET' && url.pathname === '/partials/db-initial') {
    sendHtml(res, renderDbInitial())
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not Found')
}

export const initUiServer = () => {
  if (port <= 0) {
    logger.warn('[Corn2P UI] UI server not started because port is disabled')
    return
  }

  try {
    ensureDataDir()
  } catch (error) {
    logger.error('[Corn2P UI] Failed to ensure data directory', error)
  }

  const server = createServer((req, res) => {
    handleRequest(req, res).catch(error => {
      logger.error('[Corn2P UI] Unhandled error', error)
      sendHtml(
        res,
        '<div class="notification is-danger">예상치 못한 오류가 발생했습니다.</div>',
        500,
      )
    })
  })

  server.on('error', error => {
    logger.error('[Corn2P UI] Server error', error)
  })

  server.listen(port, '0.0.0.0', () => {
    logger.info(`[Corn2P UI] Listening on port ${port}`)
  })
}
