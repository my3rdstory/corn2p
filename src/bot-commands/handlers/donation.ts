import QRCode from 'qrcode'
import { notiLog } from '../../biz/common'
import { generateBlinkInvoice } from '../../biz'
import { sendMsg, sendPhoto } from '../../biz/get-tele-bot'

interface DonationCommandOptions {
  amount: number
  label: string
  emoji?: string
}

const DONATION_API_KEY = process.env.DONATION_BLINK_API_KEY

const formatDonor = (msg): string => {
  const { from } = msg
  if (!from) {
    return 'anonymous'
  }
  if (from.username) {
    return `@${from.username}`
  }
  return [from.first_name, from.last_name].filter(Boolean).join(' ') || 'anonymous'
}

export default function createDonationHandler({
  amount,
  label,
  emoji,
}: DonationCommandOptions) {
  const prefix = emoji ? `${emoji} ` : ''

  return () => async msg => {
    const chatId = msg.chat.id

    if (!DONATION_API_KEY) {
      await sendMsg(
        chatId,
        '후원 지갑 정보가 설정되지 않아 인보이스를 만들 수 없습니다. 관리자에게 문의해 주세요.',
      )
      return
    }

    try {
      const donor = formatDonor(msg)
      const memo = `[donation] ${label} ${donor}`.slice(0, 32)

      const invoice = await generateBlinkInvoice({
        memo,
        amount,
        apiKey: DONATION_API_KEY,
      })
      await notiLog(
        `[Donation invoice created] ${label} ${amount.toLocaleString()} sats ${donor}\n${invoice.paymentRequest}`,
        { level: 'info' },
      )

      let qrBuffer: Buffer | null = null
      try {
        qrBuffer = await QRCode.toBuffer(invoice.paymentRequest, {
          type: 'png',
          margin: 1,
          scale: 6,
          errorCorrectionLevel: 'M',
        })
      } catch (qrErr: any) {
        const qrErrMsg = qrErr?.message ?? String(qrErr)
        await notiLog(
          `[Donation QR failed] ${label} ${amount} sats\n${qrErrMsg}`,
        )
      }

      await sendMsg(
        chatId,
        `${prefix}${label} 후원 인보이스가 준비됐어요 (${amount.toLocaleString()} sats). 잘 먹을게요! `,
      )

      if (qrBuffer) {
        await sendPhoto(chatId, qrBuffer)
      } else {
        await sendMsg(chatId, 'QR 이미지를 만들지 못했어요. 텍스트 인보이스를 이용해 주세요.')
      }
      await sendMsg(chatId, invoice.paymentRequest)

    } catch (err: any) {
      const errMsg = err?.message ?? String(err)
      await notiLog(
        `[Donation invoice failed] ${label} ${amount} sats\n${errMsg}`,
      )
      await sendMsg(
        chatId,
        '인보이스 생성에 실패했어요. 잠시 후 다시 시도해 주세요.',
      )
    }
  }
}
