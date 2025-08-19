// Minimal Web Crypto helpers for passphrase-based encryption
// PBKDF2-SHA256 + AES-256-GCM

export interface CryptoMeta {
  enc: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  schemaVersion: number;
}

function getSubtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto not available');
  }
  return crypto.subtle;
}

function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(b: ArrayBuffer): string {
  return new TextDecoder().decode(b);
}

function bufferSlice(u8: Uint8Array): ArrayBuffer {
  // Create a fresh ArrayBuffer copy to avoid SharedArrayBuffer typing issues
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  // btoa expects binary string
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKeyFromPassphrase(passphrase: string): Promise<CryptoKey> {
  const raw = utf8Encode(passphrase);
  return getSubtle().importKey('raw', bufferSlice(raw), 'PBKDF2', false, ['deriveKey']);
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const baseKey = await importKeyFromPassphrase(passphrase);
  return getSubtle().deriveKey(
    {
      name: 'PBKDF2',
      salt: bufferSlice(salt),
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

export async function encryptJson<T>(
  data: T,
  passphrase: string,
  schemaVersion: number,
  iterations = 250_000
): Promise<{ payload: string; meta: CryptoMeta }> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(passphrase, salt, iterations);
  const plaintext = utf8Encode(JSON.stringify(data));
  const ciphertext = await getSubtle().encrypt(
    { name: 'AES-GCM', iv: bufferSlice(iv) },
    key,
    bufferSlice(plaintext)
  );
  const meta: CryptoMeta = {
    enc: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    schemaVersion,
  };
  return { payload: toBase64(ciphertext), meta };
}

export async function decryptJson<T = unknown>(
  payload: string,
  meta: CryptoMeta,
  passphrase: string
): Promise<T> {
  const salt = fromBase64(meta.salt);
  const iv = fromBase64(meta.iv);
  const key = await deriveAesKey(passphrase, salt, meta.iterations);
  const ciphertext = fromBase64(payload);
  const plaintext = await getSubtle().decrypt(
    { name: 'AES-GCM', iv: bufferSlice(iv) },
    key,
    bufferSlice(ciphertext)
  );
  const json = utf8Decode(plaintext);
  return JSON.parse(json) as T;
}
