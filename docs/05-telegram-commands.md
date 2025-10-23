### 텔레그램 명령어 레퍼런스

사용자/판매자/관리자 명령을 한 곳에 모았습니다. 일부 명령은 `@봇아이디`를 붙여도 인식합니다. 보다 친절한 명령어 가이드는 [이 문서](https://telegra.ph/p2p-command-08-21)를 참고해 주세요


---

### 공통

- `/help`: 이용 가이드
- `/chatid`: 현재 채팅방/대화의 chat id 확인
- `/myinfo`: 나의 등록 정보 요약
- `/price`: 현재 시세
- `/list`: 판매자 목록
- `/pricelist`: 시세 + 판매자 목록
- `/sellerinfo <sellerName>`: 판매자 정보

---

### 구매자

- `/buy <sellerId> <amountKrw>`: 지정 판매자에게 금액만큼 구매 요청
- `/buy <amountKrw>`: 금액만 지정하여 구매(판매자 선택은 우선순위에 따름)
- `/deletebuyer`: 내 구매자 등록 삭제
- `/deletetrade_<tradeId>`: 내 미정산 거래 취소

숫자 단축 구매:

- `/<금액>`: 예) `/10000`, `/30000`, `/100000`, `/200000`, `/300000`, `/500000`, `/1000000`

---

### 판매자

- `/newseller <args...>`: 판매자 등록(안드로이드)
- `/newselleriphone <args...>`: 판매자 등록(iOS)
- `/deleteseller`: 판매자 등록 삭제(조건 충족 필요)
- `/hideme` / `/showme`: 판매자 목록 노출/숨김 전환
- `/editp <premium>`: 프리미엄 수정
- `/editcontact <contact>`: 연락처 수정
- `/editaccount`: 계좌 수정(형식은 핸들러 문구 참조)
- `/tradesNotPaid` 또는 `/tnp`: 미정산 거래 목록
- `/confirmkrw_<tradeShortId>`: 입금 확인
- `/confirmkrwandsendsats_<tradeShortId>`: 입금 확인 + 송금 실행
- `/confirmsatssended_<tradeShortId>`: 송금 완료 확인
- `/deletetradenotpaid_<tradeShortId>`: 미정산 거래 삭제
- `/buyerinfo <buyerId>`: 구매자 정보

---

### 관리자

관리자 명령은 `CHAT_ID.admin` (biz/config.ts) 에 등록된 그룹 채팅방에서만 이용 가능합니다.

- `/adminwslist`: 판매자 푸시불릿 모니터링 웹소켓 목록 조회
- `/adminallsellers`: 전체 판매자 목록
- `/adminallbuyers`: 전체 구매자 목록
- `/adminalltrades`: 전체 거래 목록
- `/adminTradesNotPaid` 또는 `/atnp`: 전체 미정산 거래 목록
- `/admindeletetrade <tradeId>`: 거래 삭제
- `/admindeleteseller <sellerId>`: 판매자 삭제
- `/admineditp <sellerId> <premium>`: 판매자 프리미엄 수정
- `/adminhideme <sellerId>`: 특정 판매자 숨김
- `/admindeletebuyer <buyerLnAddress>`: 구매자 삭제
- `/admincleartradecompleted`: 완료 거래 정리
- `/admincleartradenotpaid`: 미정산 거래 정리

---

### 참고

- 일부 명령은 정규식으로 다양한 인자 수를 허용합니다. 인자가 부족하면 안내 메시지를 반환합니다.
- 오류가 발생하면 축약된 에러 메시지가 사용자에게, 상세는 관리자 채널(`CHAT_ID.error`)로 전달됩니다.
