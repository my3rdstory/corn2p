### 개발 가이드 (스크립트/디버깅/로그)

개발 환경 세팅, 실행 스크립트, 디버깅, 로깅을 빠르게 익히기 위한 가이드입니다.

---

### Node/의존성

- Node 20.x 이상 권장
- `npm install`로 의존성 설치

---

### 실행 스크립트

- 개발: `npm run dev`
  - `ts-node-dev`로 핫 리로드, `.env.dev`를 로드합니다.
  - nodemon(ignore): `db.json`, `db-dev.json`, `**/test/**`, `**/docs/**`
- 빌드: `npm run build`
  - `dist/`를 초기화하고 TS → JS로 컴파일합니다.
- 운영: `npm start`
  - `.env`를 로드하고 `dist/index.js`를 실행합니다.

---

### 디버깅

- 로컬에서는 텔레그램 테스트 봇을 별도로 생성해 `.env.dev`에 설정하세요.
- 명령어 입력 후 동작이 없을 때는 `src/bot-commands/index.ts`의 정규식 매칭을 확인합니다.
- 브레이크포인트: VSCode `launch.json`에서 `ts-node-dev` 또는 `node dist/index.js` 기준으로 설정해 디버깅할 수 있습니다.

---

### 로깅/모니터링

- `if-logger` 기반 로그 출력. 각 명령은 래퍼에서 처리 시간 로깅.
- 에러 발생 시:
  - 사용자에겐 축약 메시지
  - 관리자 채널(`CHAT_ID.error`)에는 상세 메시지와 사용자 정보 포맷이 전달됩니다.
- 운영/개발 채널 분리는 `config.CHAT_ID`에서 관리합니다.

---

### 코드 스타일/테스트

- 타입스크립트를 이용한 타입 사용을 적극 권장하지만 자유도와 유연성을 위해 필요하다면 any 타입을 사용할 수 있습니다.
- Jest 기반 테스트: `npm test`, 워치 모드 `npm run test:watch`
- 커버리지: `npm run test:coverage` → `coverage/lcov-report/index.html`

---

### 자주 수정하는 위치

- 새 명령 추가: `src/bot-commands/index.ts`에 매핑, 핸들러는 `handlers/` 생성
- 정책/상수 변경: `src/biz/config.ts`
- 공통 메시지/로깅 포맷: `src/biz/common.ts`
