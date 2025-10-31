# Corn2P Architecture

이 문서는 Corn2P 코드베이스가 어떻게 동작하는지, 주요 컴포넌트들이 어떤 방식으로 상호작용하는지를 정리한 기술 개요입니다. 타입스크립트 소스 기준으로 작성되었으며, 빌드 결과물(`dist/`)은 `src/` 구조를 그대로 트랜스파일한 것입니다.

## 시스템 개요
- **주요 외부 의존성**
  - 텔레그램 봇 API: `node-telegram-bot-api`를 통해 메시지 수신/전송
  - Pushbullet WebSocket: 판매자 입금 알림 감지
  - Blink/Strike API: 라이트닝 인보이스 생성 및 송금
  - Discord API: slash 명령으로 텔레그램 사용자 인증
  - 업비트·빗썸·바이낸스·국내 은행 환율 API: 시세/환율 데이터 수집
- **영속 저장소**
  - `db.json`(또는 `db-dev.json`): 판매자/구매자/거래 데이터
  - `auth-db.json`(또는 `auth-db-dev.json`): Discord 역할 인증 내역
  - JSON 파일은 `src/biz/db-manager.ts`, `src/biz/auth-store.ts`가 단일 프로세스 메모리 캐시와 함께 직접 읽고 씁니다.
- **환경 변수**
  - `.env`를 통해 텔레그램/Discord/Blink/Strike 키, 암호화 비밀키(`ENC_SECRET`) 등을 주입
  - `src/biz/encrypt.ts`는 판매자 API 키를 AES로 암복호화합니다.

## 부트스트랩 흐름 (`src/index.ts`)
1. `getTeleBot()` – 텔레그램 봇 인스턴스를 `polling` 모드로 생성하고 재사용 가능한 싱글턴으로 유지합니다.
2. `initBotCommands()` – 모든 텔레그램 명령을 등록하고 인증 래퍼/로깅을 적용합니다.
3. `initWsList()` – Pushbullet WebSocket을 판매자별로 연결해 입금 푸시를 감시합니다.
4. `initDiscordBot()` – Discord 클라이언트를 초기화하고 `/auth` slash 명령을 등록합니다.
5. `notiLog()` – 기동 로그를 텔레그램 로그 채널로 전송합니다.

## 텔레그램 명령 처리 (`src/bot-commands`)
### 공통 래퍼
`getAddCommand()`는 각 명령을 래핑하여 측정/로깅과 예외 처리를 수행합니다.
- 실행 시간 측정: `if-logger` 기반 로거로 `logger.log.time(...)` / `timeEnd(...)`.
- 예외 발생 시: `notiLog()`와 `sendMsg()`를 사용해 관리자 채널과 사용자에게 에러를 전달합니다.

### 인증 게이트 (`helpers/with-auth.ts`)
- 대부분의 명령은 Discord 역할 인증을 요구합니다.
- `isChatIdAuthorized()`가 실패하면 `/auth` 명령 안내와 일회용 6자리 코드를 텔레그램으로 제공하고 실행을 중단합니다.

### 명령 카테고리
- **공통**: `/help`, `/price`, `/list`, `/myinfo`, `/coffee` 등
- **구매자**: `/buy`, 숫자 단축 명령, `/deletetrade`
- **판매자**: `/newseller`, `/confirmkrw`, `/confirmkrwandsendsats`, `/tradesNotPaid`, `/hideme` 등
- **관리자**: `/admin*` 네임스페이스 – 등록자 리스트, 거래 정리, 판매자/구매자 삭제 등
- 모든 명령 핸들러는 `bot.onText`로 등록된 비동기 함수이며, 주된 비즈니스 로직은 `src/biz` 모듈을 호출합니다.

## 데이터 모델 (`src/types/index.ts`)
- `Seller`, `Buyer`, `Trade` 인터페이스는 거래 상태를 표현합니다.
- `trade`에는 거래 금액, 시세 정보, 생성된 라이트닝 인보이스/Quote, 만료 시각 등이 저장됩니다.
- `Seller`와 `Buyer`는 누적 거래량, 오늘 거래 요약(todayAcc) 등을 포함합니다.

## 거래 생성 플로우
1. **입력 검사** – `/buy` 시 `src/bot-commands/handlers/buy.ts`가 `buySats()`를 호출합니다. (구매 금액 범위, 판매자 한도, 미정산 거래 수, 레이트 제한 등을 검증)
2. **거래 구성** – `buy-sats.ts` → `create-trade.ts`
   - Blink 판매자: `getPaymentInvoice()`로 구매자 Lightning 인보이스를 미리 받아 `trade.paymentLnInvoice`에 저장
   - Strike 판매자: `createQuote()`로 payment quote 생성
   - 수수료 인보이스(필요 시)와 P2P 요약 메모 작성
3. **타이머 설정**
   - `KRW_DEPOSIT_EXPIRE`/`KRW_DEPOSIT_EXPIRE_ALARM` 기준으로 만료 알림 예약 (`setTimeout`)
4. **알림 전송**
   - 구매자/판매자/관리자 전용 메시지 구성 (`tradeTldr`, `serializeTrade`)
   - sequentialInvoke 된 `sendMsg()`로 메시지 순서를 보장하고 전송량을 조절합니다.

## 입금 확인 및 사토시 전송
### Pushbullet 연동 (`src/biz/ws-manager.ts`)
- 판매자별 Pushbullet Access Token을 복호화 후 WebSocket 연결
- `checkPayment()`가 “입금 + 금액 + authMemo” 문자열을 모두 포함하면 해당 거래를 찾습니다.
- 판매자 활성화(`enableSeller`) 및 자동 입금 확인 처리 후 `withdrawSats()` 호출

### 수동 확인
- `/confirmkrw_{tradeId}`: 판매자가 입금 확인용 안내 메시지를 받고 `/confirmkrwandsendsats_{tradeId}` 버튼을 눌러 직접 `checkPayment(..., confirmed=true)`를 호출할 수 있습니다.

### 송금 로직 (`withdrawSats`, `sendSats`)
1. 한 번도 송금되지 않은 경우에만 처리.
2. `sendSats()` → `sendSatsLnAddress()`:
   - Blink API (`sendSatsBlink`): 저장된 Lightning invoice를 GraphQL `LnInvoicePaymentSend`에 전달
   - Strike API (`sendSatsStrike`): 생성된 payment quote 실행
3. 성공 시:
   - `Trade.satsSended = true` 갱신, 판매자 거래 통계 업데이트
   - Telegram 채널 및 당사자에게 성공 알림, `tradeStatus`/`tradeTldr` 활용
4. 실패 시:
   - 오류 메시지를 포함해 `notiLog()` 전송, 예외를 다시 던져 명령 흐름에 알립니다.
   - Blink/Strike에서 “이미 결제됨”과 같은 idempotent 오류는 별도 분기 처리합니다.
5. 수수료 납부 (`payTradeFee`):
   - 거래 금액 기반으로 추가 수수료 인보이스를 생성해 관리자 Blink 주소로 송금

## 가격/한도 계산
- `getBtcPrice()` (`fnWithCache` + `sequentialInvoke`): 업비트(기본) 또는 빗썸 API, 실패 시 Bithumb fallback
- `getBtcPriceBinance()`: 바이낸스 REST
- `getWonDollarRate()`: 우리/하나/네이버/신한/국민 환율 API 중 Promise.any 성공값
- `tradeMaxAmountKrw()`: 판매자 잔액, 출금 한도, 미정산 거래 등을 고려한 최대 구매 가능금액 산출
- `krwRecvLimit()`, `SELLER_TODAY_ACC_AMOUNT_KRW_LIMIT` 등 각종 상수는 `src/biz/config.ts`에서 관리합니다.

## 인증/보안 메커니즘
- **판매자/API 키 관리**: `encrypt()`/`decrypt()`로 AES 암복호화 (`ENC_SECRET` 필요)
- **Discord 역할 인증**
  - `/auth` 텔레그램 명령 → `auth-code.ts`에서 6자리 코드 발급 (10분 TTL)
  - Discord `/auth` slash 명령 → 역할 보유 확인 후 `auth-store.ts`에 기록, 텔레그램으로 확인 메시지 전송
  - `withAuth`/`auth.ts`에서 인증 상태 조회 및 미인증자 차단

## 알림/로깅 구조
- 기본 로거: `src/utils/logger.ts` – `if-logger`의 `simpleFormat`을 사용, 타임스탬프 태그 포함
- `notiLog()` / `notiAdmin()` / `sendMsg()`:
  - 텔레그램 채널 ID는 `CHAT_ID` 상수로 분리돼 있으며, 운영/개발 환경 모두 `.env` 없이 Git 브랜치로 구분합니다.
  - `req.ts`는 모든 HTTP 호출에 대해 `logger.log.time()` 측정을 적용하고, 429 응답 시 자동 재시도합니다.
- 오류 처리:
  - 명령 핸들러에서 던진 예외는 `commandLogger` 래퍼에서 잡아 사용자/관리자 채널에 축약 메시지를 전송합니다.
  - Pushbullet/WebSocket 예외 역시 `notiLog()`와 `logger.error()`로 이중 기록합니다.

## 도메인 유틸리티 (`src/biz/common.ts`, `src/utils/lib.ts`)
- **sequentialInvoke / sequentialInvokeByParam**: 텔레그램 전송과 API 호출이 순서를 유지하도록 보장 (race condition 방지, rate-limit 완화)
- **fnWithCache / fnWithCacheByParam**: 짧은 주기의 API 응답을 캐시해 호출 수를 제한
- **manUint / todayAccInfo / tradeTldr**: 메시징 포맷터
- **checkDeposit**: Pushbullet 알림 본문에서 금액과 인증 메모를 감지하는 정규화 로직

## Discord 모듈 (`src/discord/bot.ts`)
- `Discord.js` v14 기반
- 봇 로그인 후 `/auth` 명령 등록 (`REST` API)
- Slash 명령 처리 흐름:
  1. 전달받은 코드로 `getPendingByCode()` 조회
  2. 길드 ID/필수 역할 보유 여부 확인
  3. 성공 시 `auth-store.ts`에 저장하고 텔레그램으로 완료 알림 전달
  4. 실패 시 Discord 응답을 `ephemeral`로 돌려 사용자가 다시 시도하도록 안내

## JSON 데이터 관리 (`src/biz/db-manager.ts`)
- 초기 로딩 시 파일이 없으면 빈 DB로 시작합니다.
- 모든 변경은 in-memory 객체를 수정한 뒤 `writeFileSync`로 전체 JSON을 덮어씁니다.
- `setTrades`, `updateTrade` 등은 Ramda `evolve`를 사용해 특정 인덱스를 갱신합니다.
- 실시간 파일 동기화와 충돌 방지를 위해 단일 프로세스에서 실행된다는 전제가 있습니다.

## 테스트
- `src/biz/__tests__` 디렉터리에서 Jest 기반 단위 테스트를 제공
  - 거래 생성, Pushbullet 워커, `notiLog` 동작 등 핵심 시나리오 검증
- `npm test` / `npm run test:watch` / `npm run test:coverage` 스크립트 제공

## 빌드 & 실행
- 개발: `npm run dev` (`ts-node-dev` + `.env`)
- 프로덕션: `npm run build` → `dist/` 생성 후 `npm start`
- Husky hook을 위한 `npm run prepare` 스크립트 포함
- 노출 정보: `.env.sample` 참고. `ENC_SECRET`, `TELEGRAM_BOT_TOKEN`, Blink API 키 등은 반드시 안전하게 관리해야 합니다.

## 요약
Corn2P는 텔레그램 봇을 중심으로 Discord 역할 인증, Pushbullet 실시간 입금 감시, Blink/Strike 라이트닝 송금, 그리고 JSON 기반 DB를 엮어 P2P 비트코인 거래를 자동화합니다. `src/biz` 모듈이 대부분의 비즈니스 로직(거래 생성, 송금, 수수료 처리, 가격 계산)을 담당하고, `bot-commands`가 이를 텔레그램 명령과 연결하며, `utils` 계층이 캐싱/동시성/로깅을 지원합니다. Discord 봇은 인증 게이트를 강화하고, 모든 알림은 텔레그램 채널로 집약되어 운영자가 즉시 상태를 파악할 수 있도록 설계되어 있습니다.
