import * as crypto from 'crypto';

export function aesCmac(key: Buffer, message: Buffer): Buffer {
  const Rb   = 0x87;
  const zero = Buffer.alloc(16, 0);

  const aesEnc = (k: Buffer, d: Buffer) => {
    const c = crypto.createCipheriv('aes-128-ecb', k, null);
    c.setAutoPadding(false);
    return Buffer.concat([c.update(d), c.final()]);
  };

  const shiftLeft = (b: Buffer): Buffer => {
    const out = Buffer.alloc(16);
    let carry = 0;
    for (let i = 15; i >= 0; i--) {
      out[i] = ((b[i] << 1) & 0xff) | carry;
      carry  = b[i] & 0x80 ? 1 : 0;
    }
    return out;
  };

  const xor16 = (a: Buffer, b: Buffer): Buffer => {
    const out = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) out[i] = a[i] ^ b[i];
    return out;
  };

  const L  = aesEnc(key, zero);
  let K1   = shiftLeft(L);
  if (L[0] & 0x80) K1[15] ^= Rb;
  let K2   = shiftLeft(K1);
  if (K1[0] & 0x80) K2[15] ^= Rb;

  const n            = Math.max(1, Math.ceil(message.length / 16));
  const lastComplete = message.length > 0 && message.length % 16 === 0;

  let lastBlock: Buffer;
  if (lastComplete) {
    lastBlock = xor16(message.slice((n - 1) * 16, n * 16), K1);
  } else {
    const padded = Buffer.alloc(16, 0);
    const last   = message.slice((n - 1) * 16);
    last.copy(padded);
    padded[last.length] = 0x80;
    lastBlock = xor16(padded, K2);
  }

  let X = Buffer.alloc(16, 0);
  for (let i = 0; i < n - 1; i++) {
    X = aesEnc(key, xor16(X, message.slice(i * 16, i * 16 + 16)));
  }
  return aesEnc(key, xor16(X, lastBlock));
}

/** LoRaWAN payload encrypt/decrypt (symmetric CTR-like stream cipher, dir: 0=up, 1=down) */
export function cryptPayload(keyHex: string, devAddrLE: Buffer, fCnt32: number, dir: number, payload: Buffer): Buffer {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 16) throw new Error('Session key must be 16 bytes');

  const out    = Buffer.alloc(payload.length);
  const blocks = Math.ceil(payload.length / 16);

  for (let i = 1; i <= blocks; i++) {
    const Ai = Buffer.alloc(16, 0);
    Ai[0] = 0x01;
    Ai[5] = dir & 0x01;
    devAddrLE.copy(Ai, 6);
    Ai.writeUInt32LE(fCnt32 >>> 0, 10);
    Ai[15] = i & 0xff;

    const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
    cipher.setAutoPadding(false);
    const Si = Buffer.concat([cipher.update(Ai), cipher.final()]);

    const start = (i - 1) * 16;
    const end   = Math.min(start + 16, payload.length);
    for (let j = start; j < end; j++) out[j] = payload[j] ^ Si[j - start];
  }

  return out;
}

/** LoRaWAN data-frame MIC: B0 block + AES-CMAC over MHDR|MACPayload (dir: 0=up, 1=down) */
export function computeDataMic(nwkSKeyHex: string, devAddrLE: Buffer, fCnt32: number, dir: number, msg: Buffer): Buffer {
  const key = Buffer.from(nwkSKeyHex, 'hex');
  if (key.length !== 16) throw new Error('NwkSKey must be 16 bytes');

  const B0 = Buffer.alloc(16, 0);
  B0[0] = 0x49;
  B0[5] = dir & 0x01;
  devAddrLE.copy(B0, 6);
  B0.writeUInt32LE(fCnt32 >>> 0, 10);
  B0[15] = msg.length & 0xff;

  return aesCmac(key, Buffer.concat([B0, msg])).slice(0, 4);
}
