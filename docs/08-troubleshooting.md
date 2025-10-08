### 트러블슈팅

자주 만나는 문제와 빠른 해결책을 정리했습니다.

---

### 봇이 응답하지 않음

- `.env(.dev)`의 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNANE` 확인
- `npm run dev` 콘솔 에러와 관리자 채널(`CHAT_ID.error`)의 에러 메시지 확인

---

### 판매자 등록 실패

- `config.SELLER_WALLET_MIN_BALANCE`, `SELLER_WALLET_MIN_KRW` 기준 충족 여부 확인
- `ADMIN_ADDRESS`가 올바르게 설정되어 있는지 확인
- 프리미엄이 `MAX_PREMIUM` 초과인지 확인
- 판매자 api-key 의 잔액 확인 및 출금 권한 확인

---

### 거래 생성/진행 불가

- `BUYER_AMOUNT_MIN/MAX` 범위 확인
- 미정산 거래가 `MAX_LENGTH_TRADES_NOT_PAID` 초과인지 확인
- `BTC_PRICE_MIN`보다 시세가 낮은 경우 제한될 수 있음

---

### 입금 확인/만료 이슈

- `KRW_DEPOSIT_EXPIRE`, `KRW_DEPOSIT_EXPIRE_ALARM` 설정 확인
- 만료 후 늦게 도착한 알림은 `WATING_NOTI_TIME` 동안 대기 처리

---

### 로그/알림이 보이지 않음

- `config.CHAT_ID`에서 각 채널 id가 설정되어 있는지 확인(개발/운영 분리)
- `get-tele-bot`의 전송 에러 로그 확인

---

### 성능/과도한 요청

- `TOO_MANY_REQUEST_LIMIT`로 레이트 제한을 적용합니다. 값 조정 고려.

---

### 기타

- 핸들러가 보이지 않으면 `src/bot-commands/index.ts`에 라우팅이 추가되어 있는지 확인
- 저장 실패/포맷 이슈는 `db-manager.ts` 접근부와 JSON 구조 확인
