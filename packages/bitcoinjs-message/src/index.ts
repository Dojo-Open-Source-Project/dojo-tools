/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
import { sha256 } from '@noble/hashes/sha2'
import { ripemd160 } from '@noble/hashes/legacy'
import { concatBytes, isBytes, utf8ToBytes, hexToBytes } from '@noble/hashes/utils'
import { bech32, createBase58check, base64 } from '@scure/base'
import * as varuint from 'varuint-bitcoin'

import { areUint8ArraysEqual } from './utils.js'
import { testEcc, TinySecp256k1Interface } from './testecc.js'

const bs58check = createBase58check(sha256)

const SEGWIT_TYPES = {
  P2WPKH: 'p2wpkh',
  P2SH_P2WPKH: 'p2sh(p2wpkh)'
} as const

function hash256 (buffer: Uint8Array): Uint8Array {
  return sha256(sha256(buffer))
}

function hash160 (buffer: Uint8Array): Uint8Array {
  return ripemd160(sha256(buffer))
}

function encodeSignature (signature: Uint8Array, recovery: number, compressed?: boolean, segwitType?: typeof SEGWIT_TYPES[keyof typeof SEGWIT_TYPES]): Uint8Array {
  if (segwitType !== undefined) {
    recovery += 8
    if (segwitType === SEGWIT_TYPES.P2WPKH) recovery += 4
  } else {
    if (compressed) recovery += 4
  }

  return concatBytes(new Uint8Array([recovery + 27]), signature)
}

interface DecodeSignatureReturnType {
  compressed: boolean
  segwitType: typeof SEGWIT_TYPES[keyof typeof SEGWIT_TYPES] | null
  recovery: 0 | 1 | 2 | 3
  signature: Uint8Array
}

function decodeSignature (buffer: Uint8Array): DecodeSignatureReturnType {
  if (buffer.length !== 65) throw new Error('Invalid signature length')

  const flagByte = buffer[0] - 27
  if (flagByte > 15 || flagByte < 0) {
    throw new Error('Invalid signature parameter')
  }

  return {
    compressed: !!(flagByte & 12),
    segwitType: !(flagByte & 8)
      ? null
      : !(flagByte & 4)
          ? SEGWIT_TYPES.P2SH_P2WPKH
          : SEGWIT_TYPES.P2WPKH,
    recovery: (flagByte & 3) as 0 | 1 | 2 | 3,
    signature: buffer.slice(1)
  }
}

interface SignatureOptions {
  segwitType?: 'p2wpkh' | 'p2sh(p2wpkh)'
  extraEntropy?: Uint8Array
}

interface SignerBase<T = any> {
  sign: (hash: Uint8Array, extraEntropy?: Uint8Array) => T
}

export interface Signer extends SignerBase {
  // param hash: 32 byte Buffer containing the digest of the message
  // param extraEntropy (optional): the 32 byte Buffer of the "extra data" part of RFC6979 nonces
  // returns object
  //   attribute signature: 64 byte Buffer, first 32 R value, last 32 S value of ECDSA signature
  //   attribute recovery: Number (integer) from 0 to 3 (inclusive), also known as recid, used for pubkey recovery
  sign: (hash: Uint8Array, extraEntropy?: Uint8Array) => { signature: Uint8Array, recoveryId: number }
}

export interface SignerAsync extends SignerBase {
  // Same as Signer, but return is wrapped in a Promise
  sign: (hash: Uint8Array, extraEntropy?: Uint8Array) => Promise<{ signature: Uint8Array, recoveryId: number }>
}

export function magicHash (message: string | Uint8Array, messagePrefix?: string | null | Uint8Array): Uint8Array {
  messagePrefix = messagePrefix ?? '\u0018Bitcoin Signed Message:\n'
  if (!(isBytes(messagePrefix))) {
    messagePrefix = utf8ToBytes(messagePrefix)
  }
  if (!isBytes(message)) {
    message = utf8ToBytes(message)
  }
  const messageVISize = varuint.encodingLength(message.length)
  const buffer = new Uint8Array(messagePrefix.length + messageVISize + message.length)
  buffer.set(messagePrefix, 0)
  varuint.encode(message.length, buffer, messagePrefix.length)
  buffer.set(message, messagePrefix.length + messageVISize)
  return hash256(buffer)
}

interface PrepareSignReturnType {
  messagePrefixArg: string | Uint8Array | undefined
  segwitType: typeof SEGWIT_TYPES[keyof typeof SEGWIT_TYPES] | undefined
  extraEntropy: Uint8Array | undefined
}

function prepareSign (messagePrefix?: string | Uint8Array | SignatureOptions, sigOptions?: SignatureOptions): PrepareSignReturnType {
  let messagePrefixArg: string | Uint8Array | undefined
  if (typeof messagePrefix === 'object' && sigOptions === undefined && !isBytes(messagePrefix)) {
    sigOptions = messagePrefix
    messagePrefixArg = undefined
  } else if (typeof messagePrefix === 'string' || isBytes(messagePrefix)) {
    messagePrefixArg = messagePrefix
  }
  let { segwitType, extraEntropy } = sigOptions ?? {}
  if (segwitType && typeof segwitType === 'string') {
    segwitType = segwitType.toLowerCase() as typeof SEGWIT_TYPES[keyof typeof SEGWIT_TYPES]
  }
  if (
    segwitType &&
        segwitType !== SEGWIT_TYPES.P2SH_P2WPKH &&
        segwitType !== SEGWIT_TYPES.P2WPKH
  ) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Unrecognized segwitType: use "${SEGWIT_TYPES.P2SH_P2WPKH}" or "${SEGWIT_TYPES.P2WPKH}"`)
  }

  return {
    messagePrefixArg,
    segwitType,
    extraEntropy
  }
}

function isSigner (obj: unknown): obj is SignerBase {
  return obj != null && typeof obj === 'object' && 'sign' in obj && typeof obj.sign === 'function'
}

function segwitRedeemHash (publicKeyHash: Uint8Array): Uint8Array {
  const redeemScript = concatBytes(
    hexToBytes('0014'),
    publicKeyHash
  )
  return hash160(redeemScript)
}

function decodeBech32 (address: string): Uint8Array {
  const result = bech32.decode(address as 'bc1string')
  return bech32.fromWords(result.words.slice(1))
}

export const bitcoinMessageFactory = (ecc: TinySecp256k1Interface) => {
  testEcc(ecc)

  function sign (message: string | Uint8Array, privateKey: Uint8Array | Signer, compressed?: boolean, sigOptions?: SignatureOptions): Uint8Array
  function sign (message: string | Uint8Array, privateKey: Uint8Array | Signer, compressed?: boolean, messagePrefix?: string | Uint8Array, sigOptions?: SignatureOptions): Uint8Array
  function sign (message: string | Uint8Array, privateKey: Uint8Array | Signer, compressed?: boolean, messagePrefix?: string | Uint8Array | SignatureOptions, sigOptions?: SignatureOptions): Uint8Array {
    const { messagePrefixArg, segwitType, extraEntropy } = prepareSign(messagePrefix, sigOptions)
    const hash = magicHash(message, messagePrefixArg)
    const sigObj = isSigner(privateKey)
      ? privateKey.sign(hash, extraEntropy)
      : ecc.signRecoverable(hash, privateKey, extraEntropy)
    return encodeSignature(
      sigObj.signature,
      sigObj.recoveryId,
      compressed,
      segwitType
    )
  }

  function signAsync (message: string | Uint8Array, privateKey: Uint8Array | SignerAsync | Signer, compressed?: boolean, sigOptions?: SignatureOptions): Promise<Uint8Array>
  function signAsync (message: string | Uint8Array, privateKey: Uint8Array | SignerAsync | Signer, compressed?: boolean, messagePrefix?: string | Uint8Array, sigOptions?: SignatureOptions): Promise<Uint8Array>
  async function signAsync (message: string | Uint8Array, privateKey: Uint8Array | SignerAsync | Signer, compressed?: boolean, messagePrefix?: string | Uint8Array | SignatureOptions, sigOptions?: SignatureOptions): Promise<Uint8Array> {
    let messagePrefixArg: PrepareSignReturnType['messagePrefixArg']
    let segwitType: PrepareSignReturnType['segwitType']
    let extraEntropy: PrepareSignReturnType['extraEntropy']

    return await Promise.resolve().then(async () => {
      ({ messagePrefixArg, segwitType, extraEntropy } = prepareSign(messagePrefix, sigOptions))
      const hash = magicHash(message, messagePrefixArg)
      return isSigner(privateKey)
        ? await privateKey.sign(hash, extraEntropy)
        : ecc.signRecoverable(hash, privateKey, extraEntropy)
    }).then((sigObj) => {
      return encodeSignature(
        sigObj.signature,
        sigObj.recoveryId,
        compressed,
        segwitType
      )
    })
  }

  function verify (message: string, address: string, signature: Uint8Array | string, messagePrefix?: string | null, checkSegwitAlways?: boolean): boolean {
    if (!isBytes(signature)) signature = base64.decode(signature)

    const parsed = decodeSignature(signature)

    if (checkSegwitAlways && !parsed.compressed) {
      throw new Error('checkSegwitAlways can only be used with a compressed pubkey signature flagbyte')
    }

    const hash = magicHash(message, messagePrefix)
    const publicKey = ecc.recover(
      hash,
      parsed.signature,
      parsed.recovery,
      parsed.compressed
    )

    if (publicKey == null) throw new Error('Could not recover public key')

    const publicKeyHash = hash160(publicKey)
    let actual, expected

    if (parsed.segwitType) {
      if (parsed.segwitType === SEGWIT_TYPES.P2SH_P2WPKH) {
        actual = segwitRedeemHash(publicKeyHash)
        expected = bs58check.decode(address).slice(1)
      } else {
      // parsed.segwitType === SEGWIT_TYPES.P2WPKH
      // must be true since we only return null, P2SH_P2WPKH, or P2WPKH
      // from the decodeSignature function.
        actual = publicKeyHash
        expected = decodeBech32(address)
      }
    } else {
      if (checkSegwitAlways) {
        try {
          expected = decodeBech32(address)
          // if address is bech32 it is not p2sh
          return areUint8ArraysEqual(publicKeyHash, expected)
        } catch (e) {
          const redeemHash = segwitRedeemHash(publicKeyHash)
          expected = bs58check.decode(address).slice(1)
          // base58 can be p2pkh or p2sh-p2wpkh
          return (
            areUint8ArraysEqual(publicKeyHash, expected) ||
                    areUint8ArraysEqual(redeemHash, expected)
          )
        }
      } else {
        actual = publicKeyHash
        expected = bs58check.decode(address).slice(1)
      }
    }

    return areUint8ArraysEqual(actual, expected)
  }

  return {
    sign, signAsync, verify
  }
}
