/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { hexToBytes } from '@noble/hashes/utils'
import { areUint8ArraysEqual } from './utils.js'

type RecoveryIdType = 0 | 1 | 2 | 3

interface XOnlyPointAddTweakResult {
  parity: 1 | 0
  xOnlyPubkey: Uint8Array
}

interface RecoverableSignature {
  signature: Uint8Array
  recoveryId: RecoveryIdType
}

export interface TinySecp256k1Interface {
  isPoint: (p: Uint8Array) => boolean
  isPrivate: (d: Uint8Array) => boolean
  pointFromScalar: (d: Uint8Array, compressed?: boolean) => Uint8Array | null
  pointAddScalar: (
    p: Uint8Array,
    tweak: Uint8Array,
    compressed?: boolean,
  ) => Uint8Array | null
  privateAdd: (d: Uint8Array, tweak: Uint8Array) => Uint8Array | null
  sign: (h: Uint8Array, d: Uint8Array, e?: Uint8Array) => Uint8Array
  signRecoverable: (h: Uint8Array, d: Uint8Array, e?: Uint8Array) => RecoverableSignature
  signSchnorr?: (h: Uint8Array, d: Uint8Array, e?: Uint8Array) => Uint8Array
  verify: (
    h: Uint8Array,
    Q: Uint8Array,
    signature: Uint8Array,
    strict?: boolean,
  ) => boolean
  verifySchnorr?: (h: Uint8Array, Q: Uint8Array, signature: Uint8Array) => boolean
  xOnlyPointAddTweak?: (
    p: Uint8Array,
    tweak: Uint8Array,
  ) => XOnlyPointAddTweakResult | null
  privateNegate?: (d: Uint8Array) => Uint8Array
  recover: (h: Uint8Array, signature: Uint8Array, recoveryId: RecoveryIdType, compressed?: boolean) => Uint8Array | null
}

export function testEcc (ecc: TinySecp256k1Interface): void {
  assert(
    ecc.isPoint(
      hexToBytes('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798')
    )
  )
  assert(
    !ecc.isPoint(
      hexToBytes('030000000000000000000000000000000000000000000000000000000000000005')
    )
  )
  assert(
    ecc.isPrivate(
      hexToBytes('79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798')
    )
  )
  // order - 1
  assert(
    ecc.isPrivate(
      hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140')
    )
  )
  // 0
  assert(
    !ecc.isPrivate(
      hexToBytes('0000000000000000000000000000000000000000000000000000000000000000')
    )
  )
  // order
  assert(
    !ecc.isPrivate(
      hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141')
    )
  )
  // order + 1
  assert(
    !ecc.isPrivate(
      hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364142')
    )
  )
  assert(
    areUint8ArraysEqual(
      ecc.pointFromScalar(
        hexToBytes('b1121e4088a66a28f5b6b0f5844943ecd9f610196d7bb83b25214b60452c09af')
      )!,
      hexToBytes('02b07ba9dca9523b7ef4bd97703d43d20399eb698e194704791a25ce77a400df99')
    )
  )
  if (ecc.xOnlyPointAddTweak != null) {
    assert(
      ecc.xOnlyPointAddTweak(
        hexToBytes('79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
        hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140')
      ) === null
    )

    let xOnlyRes = ecc.xOnlyPointAddTweak(
      hexToBytes('1617d38ed8d8657da4d4761e8057bc396ea9e4b9d29776d4be096016dbd2509b'),
      hexToBytes('a8397a935f0dfceba6ba9618f6451ef4d80637abf4e6af2669fbc9de6a8fd2ac')
    )
    assert(
      areUint8ArraysEqual(
        xOnlyRes!.xOnlyPubkey,
        hexToBytes('e478f99dab91052ab39a33ea35fd5e6e4933f4d28023cd597c9a1f6760346adf')
      ) && xOnlyRes!.parity === 1
    )

    xOnlyRes = ecc.xOnlyPointAddTweak(
      hexToBytes('2c0b7cf95324a07d05398b240174dc0c2be444d96b159aa6c7f7b1e668680991'),
      hexToBytes('823c3cd2142744b075a87eade7e1b8678ba308d566226a0056ca2b7a76f86b47')
    )
  }
  assert(
    areUint8ArraysEqual(
      ecc.pointAddScalar(
        hexToBytes('0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
        hexToBytes('0000000000000000000000000000000000000000000000000000000000000003')
      )!,
      hexToBytes('02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5')
    )
  )
  assert(
    areUint8ArraysEqual(
      ecc.privateAdd(
        hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e'),
        hexToBytes('0000000000000000000000000000000000000000000000000000000000000002')
      )!,
      hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140')
    )
  )
  if (ecc.privateNegate != null) {
    assert(
      areUint8ArraysEqual(
        ecc.privateNegate(
          hexToBytes('0000000000000000000000000000000000000000000000000000000000000001')
        ),
        hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140')
      )
    )
    assert(
      areUint8ArraysEqual(
        ecc.privateNegate(
          hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036413e')
        ),
        hexToBytes('0000000000000000000000000000000000000000000000000000000000000003')
      )
    )
    assert(
      areUint8ArraysEqual(
        ecc.privateNegate(
          hexToBytes('b1121e4088a66a28f5b6b0f5844943ecd9f610196d7bb83b25214b60452c09af')
        ),
        hexToBytes('4eede1bf775995d70a494f0a7bb6bc11e0b8cccd41cce8009ab1132c8b0a3792')
      )
    )
  }
  assert(
    areUint8ArraysEqual(
      ecc.sign(
        hexToBytes('5e9f0a0d593efdcf78ac923bc3313e4e7d408d574354ee2b3288c0da9fbba6ed'),
        hexToBytes('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140')
      )!,
      hexToBytes(
        '54c4a33c6423d689378f160a7ff8b61330444abb58fb470f96ea16d99d4a2fed07082304410efa6b2943111b6a4e0aaa7b7db55a07e9861d1fb3cb1f421044a5'
      )
    )
  )
  assert(
    ecc.verify(
      hexToBytes('5e9f0a0d593efdcf78ac923bc3313e4e7d408d574354ee2b3288c0da9fbba6ed'),
      hexToBytes('0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
      hexToBytes(
        '54c4a33c6423d689378f160a7ff8b61330444abb58fb470f96ea16d99d4a2fed07082304410efa6b2943111b6a4e0aaa7b7db55a07e9861d1fb3cb1f421044a5'
      )
    )
  )
  if (ecc.signSchnorr != null) {
    assert(
      areUint8ArraysEqual(
        ecc.signSchnorr(
          hexToBytes('7e2d58d8b3bcdf1abadec7829054f90dda9805aab56c77333024b9d0a508b75c'),
          hexToBytes('c90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b14e5c9'),
          hexToBytes('c87aa53824b4d7ae2eb035a2b5bbbccc080e76cdc6d1692c4b0b62d798e6d906')
        )!,
        hexToBytes(
          '5831aaeed7b44bb74e5eab94ba9d4294c49bcf2a60728d8b4c200f50dd313c1bab745879a5ad954a72c45a91c3a51d3c7adea98d82f8481e0e1e03674a6f3fb7'
        )
      )
    )
  }
  if (ecc.verifySchnorr != null) {
    assert(
      ecc.verifySchnorr(
        hexToBytes('7e2d58d8b3bcdf1abadec7829054f90dda9805aab56c77333024b9d0a508b75c'),
        hexToBytes('dd308afec5777e13121fa72b9cc1b7cc0139715309b086c960e18fd969774eb8'),
        hexToBytes(
          '5831aaeed7b44bb74e5eab94ba9d4294c49bcf2a60728d8b4c200f50dd313c1bab745879a5ad954a72c45a91c3a51d3c7adea98d82f8481e0e1e03674a6f3fb7'
        )
      )
    )
  }
}

function assert (bool: boolean): void {
  if (!bool) throw new Error('ecc library invalid')
}
