### 프로젝트 구조 설명

프로그램이 어떻게 시작되고, 명령이 어디로 라우팅되며, 어떤 비즈니스 로직을 거쳐 결과를 반환하는지 흐름 중심으로 설명합니다.

---

### 엔트리 포인트: `src/index.ts`

역할:

- 텔레그램 봇 명령 초기화: `initBotCommands(getTeleBot())`
- 웹소켓 초기화: `initWsList()`
- 시작 로그: `notiLog("p2phelper bot started 🚀🚀")`

결과적으로 앱이 기동되면 즉시 텔레그램 명령을 받을 준비를 마칩니다.

---

### 명령 라우팅: `src/bot-commands/index.ts`

역할:

- 정규식 기반으로 텔레그램 명령을 특정 핸들러로 매핑합니다.
- 공통 명령(`/help`, `/price`, `/list`, `/myinfo` 등), 구매자 명령(`/buy`, `/deletetrade`, 숫자 단축 구매 등), 판매자 명령(`/newseller`, `/editp`, `/confirmkrw...` 등), 관리자 명령(`/admin...`)을 정의합니다.
- 각 핸들러 호출은 공통 래퍼에서 로깅/에러 통지를 거칩니다.

핵심 포인트:

- `bot.setMyCommands`로 명령어 단축 버튼을 세팅해 UX를 높입니다.
- `getAddCommand` 래퍼가 에러를 잡아 운영 채팅방(`CHAT_ID.error`)으로 통지합니다.

---

### 핸들러: `src/bot-commands/handlers/*`

역할:

- 한 가지 유즈케이스를 담당합니다. 예: `/buy`, `/newbuyer`, `/tradesNotPaid`, `/help` 등.
- 입력 파싱 → 비즈니스 로직 호출 → 메시지 빌드 → 사용자/관리자 통지.

핸들러는 비즈니스 로직을 직접 담기보다는, `src/biz/*`의 기능을 조합해 결과를 만듭니다.

---

### 비즈니스 레이어: `src/biz/*`

구성요소:

- `config.ts`: 런타임 동작을 좌우하는 상수/파라미터. 브랜치 기반으로 dev/prod 분기, DB 경로, 수수료 정책, 한도, 만료 시간, 채팅방 등.
- `common.ts`: 공통 헬퍼(로그 포맷, 에러 포맷, 사용자 정보 포맷, 메시지 공통 유틸 등).
- `create-trade.ts`/`buy-sats.ts`: 거래 생성, 송금, 정산에 관련된 코어 로직.
- `db-manager.ts`: JSON DB 읽기/쓰기. 경로는 `config.DB_PATH`에 따릅니다.
- `get-tele-bot.ts`: 텔레그램 봇 인스턴스/메시지 전송.
- `ws-manager.ts`: 외부 알림/가격/연동을 위한 WS 관리.

---

### 데이터 저장소

- 파일 기반 JSON DB를 사용합니다.
- 개발/운영 분기는 `config.isDev`에 의해 자동 결정되며, 경로는 각각 `db-dev.json`/`db.json`입니다.

---

### 유틸/타입

- `src/utils/*`: 공용 유틸(날짜 포맷 `dayjs-ko.ts`, HTTP 래퍼 `req.ts`, 로깅 `logger.ts`, 기타 `lib.ts`).
- `src/types/*`: 교차 모듈에서 공유되는 타입 정의.

---

### 실행 스크립트(요약)

- 개발: `npm run dev` → ts-node-dev로 `src/index.ts` 실행, `.env.dev` 로드.
- 빌드: `npm run build` → `dist` 생성.
- 운영: `npm start` → `.env`로 실행, `dist/index.js` 진입.

자세한 내용은 `06-dev-guide.md` 참조.
