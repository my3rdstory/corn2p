### 아키텍처와 주요 흐름

이 문서는 핵심 유스케이스를 단계별로 설명합니다. 텍스트 순서도를 우선 제공하여 빠르게 이해할 수 있도록 했습니다.

---

### 구성요소

- 텔레그램 클라이언트: 사용자가 명령 입력
- 봇(텔레그램 Bot API): 메시지 수신/응답
- 명령 라우터: `src/bot-commands/index.ts`
- 비즈니스 로직: `src/biz/*`
- 스토리지: `db.json`/`db-dev.json`
- 외부 연동: 시세 조회/WS/알림(필요 시)

---

### 시퀀스: 판매자 등록(안드로이드)

1. 유저: `/newseller <name> <premium> <apiKey> <PushbulletKey> <BankAccount> <contact>`
2. 라우터: 정규식 매칭 → `handlers/new-seller` 호출
3. 비즈니스: apiKey 유효성/최소 잔액 확인(`config.SELLER_WALLET_MIN_BALANCE` 등)
4. 수수료/제약 확인(`config.SELLER_JOIN_FEE`, `MAX_PREMIUM`, 한도)
5. DB에 판매자 추가, 관리자 알림(`CHAT_ID.admin`)
6. 성공 메시지 응답

아이폰의 경우 `/newselleriphone` 를 사용하며 흐름은 위와 유사합니다.

---

### 시퀀스: 구매 플로우

1. 유저: `/buy <sellerName> <amountKrw>` 또는 단축 명령(`/10000`, `/30000` 등)
2. 라우터: `handlers/buy` 또는 `handlers/amount-buy`
3. 비즈니스: 거래 생성(`create-trade`), 가격/프리미엄 반영, 만료 시간 설정(`KRW_DEPOSIT_EXPIRE`)
4. 입금 안내 전송(구매자), 판매자에게 거래 알림
5. 구매자 입금 시 판매자 지갑에서 자동으로 비트코인 전송(아이폰의 경우 판매자 확인 명령 `/confirmkrw...` 대기 )
6. 거래 완료/로그/히스토리 알림

---

### 시퀀스: 미정산/정리

1. 판매자는 `tradesNotPaid` (or `/tnp`) 명령으로 미정산 거래 조회
2. 만료(`KRW_DEPOSIT_EXPIRE`)된 지난 거래는 해당 명령으로 정리 핸들러에서 삭제 가능(`/deletetradenotpaid_...`)
3. 관리자용 일괄 정리(`/admincleartradenotpaid`, `/admincleartradecompleted`)

---

### 오류/로깅

- 모든 명령은 공통 래퍼에서 try/finally로 처리 시간을 로깅합니다.
- 예외 발생 시 에러 메시지를 포맷팅해 관리자 채팅방(`CHAT_ID.error`)과 사용자에게 축약 메시지 전송.
- 일반 로그는 `if-logger`를 통해 시간 태그와 함께 출력됩니다.

---

### 확장 팁

- 새로운 명령 추가: `src/bot-commands/index.ts`에서 정규식 → 핸들러 함수 매핑을 추가하고, 핸들러는 `handlers/`에 구현합니다.
- 비즈니스 정책 변경: `src/biz/config.ts`의 상수를 먼저 확인하고 수정합니다.
- 저장 모델 변경: `src/biz/db-manager.ts`의 접근 레이어를 우선 수정합니다.
