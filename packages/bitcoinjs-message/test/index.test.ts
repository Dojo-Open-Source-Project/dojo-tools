/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
import { test, assert } from 'vitest'
import { bytesToHex } from '@noble/hashes/utils'
import { base64 } from '@scure/base'
import * as secp256k1 from 'tiny-secp256k1'
import * as bitcoin from 'bitcoinjs-lib'
import { ECPairFactory } from 'ecpair'

import { bitcoinMessageFactory, magicHash } from '../src/index.js'

import fixtures from './fixtures.json' with { type: 'json' }

const ECPair = ECPairFactory(secp256k1)
const message = bitcoinMessageFactory(secp256k1)

type Network = keyof typeof fixtures['networks']

function getMessagePrefix (networkName: string): string {
  return fixtures.networks[networkName as Network]
}

function createTypedArray (number: number, length: number): Uint8Array {
  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)
  for (let i = 0; i < length; ++i) {
    view.setUint8(length - 1 - i, number & (255))
    number = number >> 8
  }
  return new Uint8Array(buffer)
}

fixtures.valid.magicHash.forEach(f => {
  test('produces the magicHash for "' + f.message + '" (' + f.network + ')',
    () => {
      const actual = magicHash(f.message, getMessagePrefix(f.network))
      assert.strictEqual(bytesToHex(actual), f.magicHash)
    }
  )
})

fixtures.valid.sign.forEach(f => {
  test('sign: ' + f.description, async () => {
    const pk = createTypedArray(Number(f.d), 32)
    const signer = (hash: Uint8Array, ex?: Uint8Array) => secp256k1.signRecoverable(hash, pk, ex)
    const signerAsync = async (hash: Uint8Array, ex?: Uint8Array) => secp256k1.signRecoverable(hash, pk, ex)
    let signature = message.sign(
      f.message,
      pk,
      false,
      getMessagePrefix(f.network)
    )
    const signature2 = message.sign(
      f.message,
      { sign: signer },
      false,
      getMessagePrefix(f.network)
    )
    const signature3 = await message.signAsync(
      f.message,
      { sign: signerAsync },
      false,
      getMessagePrefix(f.network)
    )
    const signature4 = await message.signAsync(
      f.message,
      { sign: signer },
      false,
      getMessagePrefix(f.network)
    )
    const signature5 = await message.signAsync(
      f.message,
      pk,
      false,
      getMessagePrefix(f.network)
    )
    assert.strictEqual(base64.encode(signature), f.signature)
    assert.strictEqual(base64.encode(signature2), f.signature)
    assert.strictEqual(base64.encode(signature3), f.signature)
    assert.strictEqual(base64.encode(signature4), f.signature)
    assert.strictEqual(base64.encode(signature5), f.signature)

    if (f.compressed != null) {
      signature = message.sign(f.message, pk, true, getMessagePrefix(f.network))
      assert.strictEqual(base64.encode(signature), f.compressed.signature)
    }

    if (f.segwit != null) {
      if (f.segwit.P2SH_P2WPKH) {
        signature = message.sign(
          f.message,
          pk,
          true,
          getMessagePrefix(f.network),
          { segwitType: 'p2sh(p2wpkh)' }
        )
        assert.strictEqual(base64.encode(signature), f.segwit.P2SH_P2WPKH.signature)
      }
      if (f.segwit.P2WPKH) {
        signature = message.sign(
          f.message,
          pk,
          true,
          getMessagePrefix(f.network),
          { segwitType: 'p2wpkh' }
        )
        assert.strictEqual(base64.encode(signature), f.segwit.P2WPKH.signature)
      }
    }
  })
})

fixtures.valid.verify.forEach(f => {
  test(
    'verifies a valid signature for "' + f.message + '" (' + f.network + ')',
    () => {
      assert.isTrue(
        message.verify(
          f.message,
          f.address,
          f.signature,
          getMessagePrefix(f.network)
        )
      )

      if (f.network === 'bitcoin') {
        // defaults to bitcoin network
        assert.isTrue(message.verify(f.message, f.address, f.signature))
      }

      if (f.compressed != null) {
        assert.isTrue(
          message.verify(
            f.message,
            f.compressed.address,
            f.compressed.signature,
            getMessagePrefix(f.network)
          )
        )
      }

      if (f.segwit != null) {
        if (f.segwit.P2SH_P2WPKH) {
          assert.isTrue(
            message.verify(
              f.message,
              f.segwit.P2SH_P2WPKH.address,
              f.segwit.P2SH_P2WPKH.signature,
              getMessagePrefix(f.network)
            )
          )
          assert.isTrue(
            message.verify(
              f.message,
              f.segwit.P2SH_P2WPKH.address,
              f.segwit.P2SH_P2WPKH.signature.replace(/^./, 'I'),
              getMessagePrefix(f.network),
              true
            )
          )
        }
        if (f.segwit.P2WPKH) {
          assert.isTrue(
            message.verify(
              f.message,
              f.segwit.P2WPKH.address,
              f.segwit.P2WPKH.signature,
              getMessagePrefix(f.network)
            )
          )
          assert.isTrue(
            message.verify(
              f.message,
              f.segwit.P2WPKH.address,
              f.segwit.P2WPKH.signature.replace(/^./, 'I'),
              getMessagePrefix(f.network),
              true
            )
          )
        }
      }
    }
  )
})

fixtures.invalid.signature.forEach(f => {
  test('decode signature: throws on ' + f.hex, () => {
    assert.throws(() => {
      // @ts-expect-error TS2345
      message.verify(null, null, Buffer.from(f.hex, 'hex'), null)
    }, f.exception)
  })
})

fixtures.invalid.verify.forEach(f => {
  test(f.description, () => {
    assert.isFalse(
      message.verify(
        f.message,
        f.address,
        f.signature,
        getMessagePrefix('bitcoin')
      )
    )
  })
})

fixtures.randomSig.forEach(f => {
  test(f.description, () => {
    const keyPair = ECPair.fromWIF(f.wif)
    const privateKey = keyPair.privateKey!
    const address = bitcoin.payments.p2pkh({ pubkey: Buffer.from(keyPair.publicKey) })
    f.signatures.forEach(s => {
      const signature = message.sign(
        f.message,
        privateKey,
        keyPair.compressed,
        { extraEntropy: Buffer.from(s.sigData, 'base64') }
      )
      assert.isTrue(message.verify(f.message, address.address!, signature))
    })
  })
})

test('Check that compressed signatures can be verified as segwit', () => {
  const keyPair = ECPair.makeRandom()
  const privateKey = keyPair.privateKey!
  const publicKey = keyPair.publicKey
  // get addresses (p2pkh, p2sh-p2wpkh, p2wpkh)
  const p2pkhAddress = bitcoin.payments.p2pkh({ pubkey: Buffer.from(publicKey) })
  const p2shp2wpkhAddress = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(publicKey)
    })
  })
  const p2wpkhAddress = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(publicKey)
  })

  const msg = 'Sign me'
  const signature = message.sign(msg, privateKey, true)

  // Make sure it verifies
  assert.isTrue(message.verify(msg, p2pkhAddress.address!, signature))
  // Make sure it verifies even with checkSegwitAlways
  assert.isTrue(message.verify(msg, p2pkhAddress.address!, signature, null, true))

  // Check segwit addresses with true
  assert.isTrue(message.verify(msg, p2shp2wpkhAddress.address!, signature, null, true))
  assert.isTrue(message.verify(msg, p2wpkhAddress.address!, signature, null, true))
  // Check segwit with false
  assert.isFalse(message.verify(msg, p2shp2wpkhAddress.address!, signature))
  assert.throws(() => {
    message.verify(msg, p2wpkhAddress.address!, signature)
  }, /Unknown letter|Invalid checksum/g)

  const signatureUncompressed = message.sign(msg, privateKey, false)
  assert.throws(() => {
    message.verify(msg, p2shp2wpkhAddress.address!, signatureUncompressed, null, true)
  }, 'checkSegwitAlways can only be used with a compressed pubkey signature flagbyte')
})

test('Check that invalid segwitType fails', () => {
  const keyPair = ECPair.fromWIF('L3n3e2LggPA5BuhXyBetWGhUfsEBTFe9Y6LhyAhY2mAXkA9jNE56')
  const privateKey = keyPair.privateKey!

  assert.throws(() => {
    // @ts-expect-error TS2769
    message.sign('Sign me', privateKey, true, { segwitType: 'XYZ' })
  }, 'Unrecognized segwitType: use "p2sh(p2wpkh)" or "p2wpkh"')
})

test('Check that Buffers and wrapped Strings are accepted', () => {
  const keyPair = ECPair.fromWIF('L3n3e2LggPA5BuhXyBetWGhUfsEBTFe9Y6LhyAhY2mAXkA9jNE56')
  const privateKey = keyPair.privateKey!

  // eslint-disable-next-line no-new-wrappers
  const sig = message.sign(Buffer.from('Sign me', 'utf8'), privateKey, true, Buffer.from([1, 2, 3, 4]), { segwitType: 'p2wpkh' })
  assert.strictEqual(bytesToHex(sig), '276e5e5e75196dd93bba7b98f29f944156286d94cb34c376822c6ebc93e08d7b2d177e1f2215b2879caee53f39a376cf350ffdca70df4398a12d5b5adaf3b0f0bc')
})
