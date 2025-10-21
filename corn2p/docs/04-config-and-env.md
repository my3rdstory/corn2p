### 설정과 환경변수 가이드

운영/개발 환경 분기, 데이터 파일 경로, 수수료/한도 등 런타임 동작을 제어하는 방법을 설명합니다.

---

### 환경 구분

- `src/biz/config.ts`에서 현재 Git 브랜치를 조회하여 `isDev`를 계산합니다.
- `main`이 아니면 개발 모드(`isDev = true`), `main`이면 운영 모드입니다.

영향받는 항목:

- DB 경로: 개발은 `db-dev.json`, 운영은 `db.json`
- `CHAT_ID.*`: 개발/운영 방 분리 가능

---

### 주요 설정값(`src/biz/config.ts`)

- `ADMIN_ADDRESS`: 운영자 라이트닝 주소(수수료 수취/권한 검증)
- `SELLER_WALLET_MIN_BALANCE`, `SELLER_WALLET_MIN_KRW`: 판매자 등록 최소 기준
- `TRADE_FEE`, `TRADE_FEE_MIN`, `TRADE_FEE_INC_UNIT`, `TRADE_FEE_ALPHA`: 거래 수수료 정책
- `SELLER_JOIN_FEE`, `SELLER_JOIN_KRW`: 판매자 가입 관련 수수료/검증 금액
- `BUYER_AMOUNT_MIN`, `BUYER_AMOUNT_MAX`: 구매 한도
- `SELLER_NO_TRADE_LIMIT`, `BUYER_NO_TRADE_LIMIT`: 거래 없을 때 삭제 가능 일수
- `SELLER_TODAY_ACC_AMOUNT_KRW_LIMIT`: 판매자 일일 누적 한도
- `BTC_PRICE_MIN`: 비트코인 최소 가격(급변 방지 안전장치)
- `KRW_DEPOSIT_EXPIRE`, `KRW_DEPOSIT_EXPIRE_ALARM`: 입금 만료 및 알림 시간(분)
- `MAX_LENGTH_TRADES_NOT_PAID`: 구매자당 최대 미정산 거래 수
- `WATING_NOTI_TIME`: 만료 후 늦게 도착하는 알림 대기 시간
- `MAX_PREMIUM`: 프리미엄 상한
- `TOO_MANY_REQUEST_LIMIT`: 요청 레이트 제한
- `BASED_ON_UPBIT`: 시세 기준 거래소(업비트/빗썸)
- `CHAT_ID`: 운영/개발 알림 채팅방 ID 모음

---

### .env 파일 변수

루트에 `.env.dev` → `.env`를 생성하여 아래 값을 채웁니다.

필수:

- `TELEGRAM_BOT_USERNANE`: 봇 아이디(@ 없이)
- `TELEGRAM_BOT_TOKEN`: 봇 토큰
- `ENC_SECRET`: 판매자 지갑 API 키 암복호화 비밀키

예시:

```
TELEGRAM_BOT_USERNANE="p2phelper_tmp_bot"
TELEGRAM_BOT_TOKEN="8259361687:AxxxHKxxxxlC7IhhKCxxxxDy3Oe8xXBMSj4"
ENC_SECRET="blabla-secret"
```

주의:

- 토큰/시크릿은 절대 공개 저장소에 커밋하지 않습니다.
- 운영 전환 시 `.env`를 재확인하고 `config.ts`의 임계값(한도/수수료)을 운영에 맞게 조정합니다.

---

### 실행 스크립트와 환경 로드

- 개발: `npm run dev` → `ts-node-dev`로 `src/index.ts` 실행, `dotenv_config_path=.env.dev`
- 운영: `npm start` → `dist/index.js` 실행, `dotenv_config_path=.env`
