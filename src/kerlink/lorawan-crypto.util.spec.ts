import { cryptPayload, computeDataMic, aesCmac } from './lorawan-crypto.util';

describe('lorawan-crypto.util', () => {
  const keyHex = '000102030405060708090a0b0c0d0e0f';
  const devAddrLE = Buffer.from('01020304', 'hex');

  it('cryptPayload is symmetric (encrypt then decrypt returns original)', () => {
    const plain = Buffer.from('hello lorawan');
    const encrypted = cryptPayload(keyHex, devAddrLE, 5, 1, plain);
    const decrypted = cryptPayload(keyHex, devAddrLE, 5, 1, encrypted);
    expect(decrypted).toEqual(plain);
  });

  it('cryptPayload differs by direction', () => {
    const plain = Buffer.from('hello lorawan');
    const up = cryptPayload(keyHex, devAddrLE, 5, 0, plain);
    const down = cryptPayload(keyHex, devAddrLE, 5, 1, plain);
    expect(up).not.toEqual(down);
  });

  it('computeDataMic is deterministic and 4 bytes', () => {
    const msg = Buffer.from([0x60, 0x01, 0x02, 0x03, 0x04, 0x00, 0x05, 0x00, 0x01, 0xaa]);
    const mic1 = computeDataMic(keyHex, devAddrLE, 5, 1, msg);
    const mic2 = computeDataMic(keyHex, devAddrLE, 5, 1, msg);
    expect(mic1).toEqual(mic2);
    expect(mic1.length).toBe(4);
  });

  it('computeDataMic changes with fCnt', () => {
    const msg = Buffer.from([0x60, 0x01, 0x02, 0x03, 0x04, 0x00, 0x05, 0x00, 0x01, 0xaa]);
    const mic5 = computeDataMic(keyHex, devAddrLE, 5, 1, msg);
    const mic6 = computeDataMic(keyHex, devAddrLE, 6, 1, msg);
    expect(mic5).not.toEqual(mic6);
  });

  it('aesCmac produces 16-byte output', () => {
    const key = Buffer.from(keyHex, 'hex');
    const out = aesCmac(key, Buffer.from('test message'));
    expect(out.length).toBe(16);
  });
});
