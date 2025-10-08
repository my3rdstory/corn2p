import dayjsKo from '../utils/dayjs-ko'
import logger from '../utils/logger'
import { req } from '../utils/req'

export default async function krwusdShinhan(): Promise<string> {
  try {
    const url = `https://bank.shinhan.com/serviceEndpoint/httpDigital`
    const res = await req.post(url, {
      dataBody: {
        ricInptRootInfo: {
          serviceType: 'GU',
          serviceCode: 'F3733',
          nextServiceCode: '',
          pkcs7Data: '',
          signCode: '',
          signData: '',
          useSign: '',
          useCert: '',
          permitMultiTransaction: '',
          keepTransactionSession: '',
          skipErrorMsg: '',
          mode: '',
          language: 'ko',
          exe2e: '',
          hideProcess: '',
          clearTarget: '',
          callBack: 'shbObj.fncF3733Callback',
          exceptionCallback: '',
          requestMessage: '',
          responseMessage: '',
          serviceOption: '',
          pcLog: '',
          preInqForMulti: '',
          makesum: '',
          removeIndex: '',
          redirectUrl: '',
          preInqKey: '',
          _multi_transfer_: '',
          _multi_transfer_count_: '',
          _multi_transfer_amt_: '',
          userCallback: '',
          menuCode: '',
          certtype: '',
          fromMulti: '',
          fromMultiIdx: '',
          isRule: 'N',
          webUri: '/index.jsp',
          gubun: '',
          tmpField2: '',
        },
        조회구분: '',
        조회일자: dayjsKo().format('YYYYMMDD'),
        고시회차: '',
      },
      dataHeader: {
        trxCd: 'RSRFO0100A01',
        language: 'ko',
        subChannel: '49',
        channelGbn: 'D0',
      },
    })

    if (!Array.isArray(res.dataBody?.R_RIBF3733_1)) {
      if (res.dataHeader.resultDetail) {
        throw Error(
          `${res.dataHeader.resultDetail.ERR_USER_MSG1} ${res.dataHeader.resultDetail.ERR_USER_MSG2}`,
        )
      }
      logger.verbose(`[shinhan][res] ${JSON.stringify(res)}`)
    }

    const krwusd = res.dataBody.R_RIBF3733_1.find(
      item => item['통화CODE'] === 'USD',
    )?.['매매기준환율_display']

    logger.info(`Shinhan: ${krwusd}`)
    return krwusd
  } catch (err: any) {
    logger.error(`[shinhan] ${err.message}`)
    throw Error(`[shinhan] ${err.message}`)
  }
}
