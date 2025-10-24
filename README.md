# Corn2P

Corn2P는 비트코인 p2p 거래 과정을 자동화하여 보다 쉽고 빠르게 판매자와 구매자가 비트코인 거래를 수행할 수 있도록 도와주는 텔레그램 봇입니다. 현재 코드는 Umbrel 커뮤니티 앱으로 패키징되어, Umbrel 노드 이용자는 앱 스토어를 통해 손쉽게 설치 및 설정할 수 있습니다.
본 프로젝트는 toshi 님의 p2phelper를 포크한 버전이며, 원본 코드는 https://github.com/toshi0010/p2phelper 에서 확인할 수 있습니다. 훌륭한 기반을 제공해 주신 toshi 님께 감사드립니다.

<br/>
<br/>

# 설치 전 준비사항

## Corn2P 텔레그램 봇 생성 🤖

텔레그램 봇은 [@BotFather](https://t.me/BotFather) 봇을 이용해 생성합니다. 아래와 같이 `/newbot` 명령을 입력한 후 봇의 이름 그리고 username 을 차례대로 입력하면 새로운 봇 생성이 완료됩니다

![](/docs/images/telegram_bot.png)

<br/>

## .env 파일 생성

프로젝트 루트에 .env.sample 파일을 복사하여 .env 파일을 만들고 아래 환경 변수를 채워주세요.

```
TELEGRAM_BOT_USERNANE="corn2p_tmp_bot"
TELEGRAM_BOT_TOKEN="0000000000:telegram-bot-token"
ENC_SECRET="change-me"
DONATION_BLINK_API_KEY="blink_live_..."

DISCORD_BOT_TOKEN="discord-bot-token"
DISCORD_CLIENT_ID="discord-app-client-id"
DISCORD_GUILD_ID="discord-server-id"
DISCORD_REQUIRED_ROLE_ID="discord-role-id"
DISCORD_REQUIRED_ROLE_NAME="풀노더"
```

- `ENC_SECRET` 값은 길이나 형식에 제한이 없으며 판매자의 지갑 api-key 와 PushBullet key 를 암호화하고 복호화하는데 사용됩니다.
- `/coffee`, `/candy` 후원 인보이스를 사용하려면 `DONATION_BLINK_API_KEY` 에 Blink 지갑 API 키를 입력하세요. Blink 키가 없다면 인보이스 명령은 동작하지 않습니다.
- 특별히 `TELEGRAM_BOT_TOKEN` 과 `ENC_SECRET` 값은 외부에 노출되지 않도록 주의합니다.
- Discord 봇 설정에 필요한 값은 글 하단의 "Discord 인증 준비물" 섹션을 참고하세요.

<br/>

## Discord 인증 설정 🔐

- Corn2P 사용자는 텔레그램에서 `/auth` 명령을 실행하면 6자리 숫자 코드가 발급됩니다.
- Discord Corn2P 서버에서 `/auth <코드>` 슬래시 명령을 실행하면 Corn2P Discord 봇이 역할 보유 여부를 확인합니다.
- 역할이 확인되면 텔레그램으로 인증 완료 메시지가 전송되고, `auth-db.json`(운영) 또는 `auth-db-dev.json`(개발)에 기록됩니다.

<br/>

## 관리자 라이트닝 주소 설정 ⚡️

src/biz/config.ts 에서 운영자 본인의 라이트닝 주소를 입력합니다.

```
export const ADMIN_ADDRESS = 'corn2p@blink.sv'
```

- `ADMIN_ADDRESS` 는 판매자 등록시 판매자 지갑 api-key 의 출금 권한을 확인하기 위해 라이트닝 출금 주소로 사용되고 거래 수수료 설정시 거래 수수료를 입금받을 주소로도 사용됩니다.

<br/>
<br/>

# 설치 방법

## Node.js 설치 🧑‍💻

서버에 Node.js 가 설치되어 있지 않다면 Node.js 를 먼저 설치해 줍니다.

```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

- Node.js 20.9.0 이상 설치
- Node.js 설치 방법은 OS 별로 다를 수 있습니다. OS 별 Node.js 설치 방법은 LLM의 도움을 받으시기 바랍니다.
- Corn2P는 Node.js 를 사용할 수 있는 환경이라면 어디서든 구동이 가능하지만 보다 안정적인 서비스 환경을 지원하기 위해 전용 서버 머신에서 운영하실 것을 권장합니다.

<br/>

## Corn2P 다운로드 ⬇️

```
git clone https://github.com/my3rdstory/corn2p.git
```

- 기기에 git 이 설치되어 있지 않다면 git 을 먼저 설치하셔야 합니다

<br/>

## 의존성 설치 및 프로젝트 빌드 🧱

여기부터는 프로젝트의 설치 경로에서 아래 명령을 차례로 수행합니다. 프로젝트 최초 설치시 또는 이후 버젼 업데이트시 한번만 수행합니다.

### 의존성 설치

```
npm install
```

### 빌드

```
npm run build
```

<br/>

## 프로젝트 시작 🚀

개발 모드에서는 다음 명령으로 Corn2P 를 실행합니다.

```
npm run dev
```

프로덕션 모드로 실행하려면 `npm run build` 후 아래 명령을 사용합니다.

```
npm start
```

또는 백그라운드 서비스로 시작하려면 아래 명령으로 Corn2P 를 시작합니다

```
nohup npm start &
```

<br/>
<br/>

## Discord 인증 준비물 📋

Corn2P의 Discord 봇 인증을 구축하려면 아래 항목이 필요합니다.

- **Discord 개발자 포털**([https://discord.com/developers/applications](https://discord.com/developers/applications))에서 애플리케이션 생성  
  - *Bot* 탭에서 봇을 추가하고 `DISCORD_BOT_TOKEN` 을 복사  
  - *Privileged Gateway Intents* 에서 **SERVER MEMBERS INTENT** 활성화
- **Slash 명령 등록용 정보**: *General Information* 탭의 `Application ID` → `DISCORD_CLIENT_ID`
- **Corn2P Discord 서버 ID**: Discord 데스크톱 앱에서 개발자 모드 활성화 후 서버 아이콘 우클릭 → “ID 복사” (`DISCORD_GUILD_ID`)
- **필수 역할 ID**: 서버 설정 > 역할에서 대상 역할 우클릭 → “ID 복사” (`DISCORD_REQUIRED_ROLE_ID`)
- **필수 역할 이름**: 안내 메시지에 사용할 문자열 (`DISCORD_REQUIRED_ROLE_NAME`, 기본 “풀노더”)
- Corn2P Discord 봇을 Corn2P 서버에 초대하고 `/auth` 슬래시 명령을 사용할 수 있도록 권한 구성

> 팁: Discord 봇은 WebSocket 으로 Discord에 연결되므로 내부 미니 PC에서 실행해도 별도의 외부 포트가 필요 없습니다.

# 프로젝트 개발 참여 👥

프로젝트 개발에 함께 참여하길 원한다면 아래 문서를 참고해 주세요.

[/docs/00-onboarding.md](/docs/00-onboarding.md)

<br/>
<br/>

# 면책사항 🏛️

1. 본 서비스 운영 중 발생할 수 있는 문제나 피해에 대해 개발자는 어떠한 책임도 지지 않습니다. 서비스를 충분히 검증하고 안정적으로 운영할 수 있는 분만 사용하시기 바랍니다.
   1. 결제 시스템은 매우 민감한 관리가 필요한 영역입니다. 운영 과정에서 발생하는 실수나 오류로 발생한 실제 외부 결제 처리는 되돌릴 수 없으니 각별한 주의가 필요합니다.
   1. 코드에는 아직 발견되지 않은 버그나 오류가 존재할 수 있습니다. 사용 전 충분한 테스트와 검증이 필요합니다.
1. 반복적인 비트코인 P2P 거래는 법률적으로 문제 될 소지가 있습니다. 법적 이슈가 될 수 있는 사안들에 대해서는 전문가 상담을 미리 받아보기 권하며 이에 따른 법적 책임은 사용자 본인에게 있습니다.

<br/>
<br/>

# 라이선스 🌍

이 프로젝트는 MIT 라이선스로 배포됩니다. 자세한 내용은 루트의 `LICENSE` 파일을 참고하세요.

요약된 사용 요건:

- 저작권 고지와 허가 고지를 모든 사본 또는 상당 부분에 포함해야 합니다.
- 소프트웨어는 “있는 그대로(AS IS)” 제공되며, 어떠한 보증도 제공되지 않습니다.
- 사용, 복제, 수정, 병합, 발행, 배포, 재라이선스, 판매가 허용됩니다.

저작권자: toshi © 2025

<br/>
<br/>

# 프로젝트 후원 🌱

Corn2P는 중앙의 통제나 간섭 없이, 누구나 자유롭고 편리하게 비트코인을 주고받을 수 있는 p2p 거래 환경을 만들어 갑니다.
여러분의 후원은 이 자유의 네트워크를 더욱 단단하게 세우는 힘이 됩니다. 후원은 원소스 제작자에게 하시면 됩니다.

프로젝트 후원: <b>p2phelper@blink.sv</b>
