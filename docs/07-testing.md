### 테스트와 커버리지 가이드

프로젝트의 단위테스트 작성은 Jest를 사용합니다. 단위 테스트를 우선하며, 명령 핸들러/비즈니스 로직의 중요한 분기들을 검증합니다.

---

### 실행 방법

- 단일 실행: `npm test`
- 워치 모드: `npm run test:watch`
- 커버리지: `npm run test:coverage`

커버리지 리포트는 `coverage/lcov-report/index.html`에서 브라우저로 확인할 수 있습니다.

---

### 테스트 위치/패턴

- `src/**/__tests__/*.test.ts`
- 예시: `src/biz/__tests__/create-trade.test.ts`, `src/biz/__tests__/buy-sats.test.ts` 등

---

### 팁

- 비즈니스 규칙이 있는 함수는 작은 단위로 분리해 테스트하기 쉽게 유지합니다.
- 외부 연동(텔레그램/WS/HTTP)은 목/스텁으로 대체해 결정적 테스트를 만듭니다.
- 회귀 방지를 위해 버그 수정 시 테스트를 먼저 추가한 뒤 구현을 변경합니다.
