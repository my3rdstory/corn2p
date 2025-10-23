import { execSync } from 'child_process'

// Git 브랜치 확인을 통한 개발/운영 환경 구분
const branch = execSync('git rev-parse --abbrev-ref HEAD')
  .toString()
  .replace('\n', '')

export const isDev = branch !== 'main'

// 환경별 데이터베이스 파일 경로 설정
export const DB_PATH = isDev ? 'db-dev.json' : 'db.json'

// 관리자 수수료 수취용 Blink 주소
export const ADMIN_ADDRESS = 'nextmoney@strike.me'

// 판매자 등록을 위한 최소 라이트닝 잔액 (적은 금액으로 판매자 등록을 쉽게 시도해 볼 수 있도록 하기 위해 초기에는 낮게 설정)
export const SELLER_WALLET_MIN_BALANCE = 1000 // sats
// 판매자 등록을 위한 최소 원화 금액
export const SELLER_WALLET_MIN_KRW = 1000 // 1000원
// 거래 수수료 비율 (현재 0%로 설정)
export const TRADE_FEE = 0 // %
// 최소 거래 수수료 비율
export const TRADE_FEE_MIN = 0 // %
// 거래 수수료 증가 단위 (잔액이 많을수록 수수료 증가)
export const TRADE_FEE_INC_UNIT = 5_000_000
// 거래 수수료 알파 값 (잔액 증가에 따른 수수료 증가율)
export const TRADE_FEE_ALPHA = 0 // %
// 판매자 가입 수수료 (sats)
export const SELLER_JOIN_FEE = 21
// PushBullet 연동 테스트시 입금액
export const SELLER_JOIN_KRW = 10 // pushbullet 연동 테스트시 입금액

// 구매자 최소/최대 구매 금액 (구매자가 적은 금액으로 테스트해보고 신뢰를 가질 수 있도록 초기 작은 금액으로 설정)
export const BUYER_AMOUNT_MIN = 100 // 원
export const BUYER_AMOUNT_MAX = 1_000_000 // 100만원

// 판매자/구매자 삭제 가능 기간 (거래 없이 경과된 일수)
export const SELLER_NO_TRADE_LIMIT = 7 // 7 day
export const BUYER_NO_TRADE_LIMIT = 50 // 50 day

// 판매자 일일 누적 거래 한도 (원화)
export const SELLER_TODAY_ACC_AMOUNT_KRW_LIMIT = 50_000_000
// 비트코인 최소 가격 (원화)
export const BTC_PRICE_MIN = 140_000_000 // 급격한 가격 변동 방지를 위해 안전 장치
// 원화 입금 대기 만료 시간 (분)
export const KRW_DEPOSIT_EXPIRE = 3 // 3m
// 원화 입금 만료 알림 시간 (분)
export const KRW_DEPOSIT_EXPIRE_ALARM = 2 // 10m
// 구매자당 최대 미정산 거래 개수
export const MAX_LENGTH_TRADES_NOT_PAID = 3
// 거래 만료 후 늦게 도착하는 알림을 기다려 주는 시간 (분)
export const WATING_NOTI_TIME = 2
// 최대 프리미엄 비율
export const MAX_PREMIUM = 50
// 과도한 요청 제한 (초당 요청 수)
export const TOO_MANY_REQUEST_LIMIT = 50
// 비트코인 원화 가격 기준 거래소 (true: 업비트, false: 빗썸)
export const BASED_ON_UPBIT = true

/**
 * 텔레그램 채팅방 ID (환경별로 다른 채팅방 사용)
 * 아래 CHAT_ID 설정에 유형 별로 그룹채팅방을 만들어 설정하면 텔레그램을 통해 실시간으로 시스템을 모니터링 할 수 있습니다.
 * (그룹 채팅방의 아이디는 `/chatid` 명령으로 확인 가능)
 */
export const CHAT_ID = {
  history: isDev ? -4908624652 : -4908624652, // 거래 내역 채팅방
  admin: isDev ? -4908624652 : -4908624652, // 관리자 채팅방
  push: isDev ? -4908624652 : -4908624652, // PushBullet 알림 채팅방
  log: isDev ? -4908624652 : -4908624652, // 로그 채팅방
  error: isDev ? -4908624652 : -4908624652, // 에러 알림 채팅방
}
