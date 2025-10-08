import dayjs from 'dayjs'
import createLogger, { simpleFormat } from 'if-logger'

const logger = createLogger({
  format: simpleFormat,
  tags: [() => dayjs().format('YYYY-MM-DD HH:mm:ss')],
})

export default logger
