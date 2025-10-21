import CryptoJS from 'crypto-js'
import aes from 'crypto-js/aes'
import { assert } from '../utils/lib'
import { strikeApiKeyReg } from './constants'

const ENC_SECRET = process.env.ENC_SECRET

assert(ENC_SECRET, 'ENC_SECRET is required')

export const encrypt = message => aes.encrypt(message, ENC_SECRET).toString()

export const decrypt = (encrypted: string) =>
  aes.decrypt(encrypted.toString(), ENC_SECRET).toString(CryptoJS.enc.Utf8)

export const getBlinkApiKey = apiKey =>
  apiKey.startsWith('blink_') ? apiKey : decrypt(apiKey)

export const getStrikeApiKey = apiKey =>
  new RegExp(strikeApiKeyReg).test(apiKey) ? apiKey : decrypt(apiKey)

export const getDecApiKey = apiKey => {
  if (apiKey.startsWith('blink_') || new RegExp(strikeApiKeyReg).test(apiKey)) {
    return apiKey
  }
  return decrypt(apiKey)
}
