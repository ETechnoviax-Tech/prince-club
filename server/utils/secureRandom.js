import crypto from 'crypto'

const UINT32_RANGE = 0x100000000

export function secureRandomFloat() {
  return crypto.randomInt(0, UINT32_RANGE) / UINT32_RANGE
}

export function secureRandomInt(min, maxExclusive) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(maxExclusive) || maxExclusive <= min) {
    throw new Error('Invalid secure random integer range')
  }
  return crypto.randomInt(min, maxExclusive)
}
