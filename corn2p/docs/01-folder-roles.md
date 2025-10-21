### 폴더별 역할 가이드

프로젝트의 디렉터리와 주요 파일이 어떤 책임을 갖는지 한눈에 파악할 수 있도록 정리했습니다.

---

### 루트

- `package.json`: 스크립트, 의존성, 실행 엔트리 정의.
- `tsconfig.json`: TypeScript 컴파일 설정.
- `README.md`: 설치/시작 방법 개요.
- `db.json`, `db-dev.json`: 환경별 로컬 JSON DB 파일.
- `coverage/`: 테스트 커버리지 산출물.
- `dist/`: 빌드 결과(배포 실행 대상).
- `docs/`: 온보딩/가이드 문서.

---

### src (애플리케이션 소스)

- `src/index.ts`

  - 앱 진입점. 텔레그램 봇 명령 초기화(`initBotCommands`), 웹소켓 목록 초기화(`initWsList`), 시작 로그 출력.

- `src/bot-commands/`

  - 텔레그램 봇 명령 라우팅과 핸들러 모음.
  - `index.ts`: 명령 정규식 → 핸들러 매핑, `/help`, `/price`, `/list` 등 모든 명령 정의, 에러 로깅 및 `setMyCommands` 설정.
  - `handlers/`: 실제 유저 인터랙션 로직. 구매/판매/등록/조회/정보 변경/정산 등 세부 흐름.
  - `admin/`: 운영 편의 명령(전체 목록 조회, 강제 삭제/정리, WS 목록 등).

- `src/biz/`

  - 핵심 비즈니스 로직과 설정/공통 모듈.
  - `config.ts`: 환경/운영 파라미터(브랜치 기반 dev/prod, DB 경로, 수수료, 제한값, 채팅방 ID 등).
  - `common.ts`: 공통 유틸(로그 포맷, 에러 포맷, 메시지 공통 함수 등).
  - `create-trade.ts`, `buy-sats.ts`, `ws-manager.ts` 등: 거래 생성/진행/알림/WS 관리.
  - `db-manager.ts`: JSON DB 접근/저장 관리.
  - `get-tele-bot.ts`: 봇 인스턴스 생성, 메시지 전송 래퍼.

- `src/utils/`

  - `logger.ts`: if-logger 기반 로거 래퍼.
  - `req.ts`: HTTP 요청/응답 유틸(axios 래퍼 등).
  - `dayjs-ko.ts`, `lib.ts`: 날짜 포맷/일반 유틸.

- `src/types/`
  - 프로젝트 전반에서 사용하는 타입 정의.

---

### dist (빌드 산출물)

- TS → JS로 컴파일된 실행 파일. 운영에서는 `npm start`가 `dist/index.js`를 실행합니다.

---

### coverage (테스트 산출물)

- Jest 커버리지 리포트. `coverage/lcov-report/index.html`로 브라우저 확인.

---

### 문서를 찾는 법

- 온보딩: `docs/00-onboarding.md`
- 구조와 흐름: `docs/02-project-structure.md`, `docs/03-architecture-flow.md`
- 환경/설정: `docs/04-config-and-env.md`
- 명령어: `docs/05-telegram-commands.md`
