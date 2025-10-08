import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/ko.js'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.locale('ko')
dayjs.extend(require('dayjs/plugin/relativeTime'))
dayjs.extend(utc)
dayjs.extend(timezone)

interface DayjsKo extends Dayjs {
  fromNow: () => string
}

export default function dayjsKo(...args) {
  return dayjs(...args).tz('Asia/Seoul') as DayjsKo
}
