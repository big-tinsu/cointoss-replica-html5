/**
 * AES-128-CBC/PKCS7, uppercase-hex wire format — mirrors `Assets/Scripts/
 * Crypto.cs` exactly (spec §4), and is byte-for-byte identical to the sibling
 * Penaldo/Keno ports' crypto module (same key/IV pair, confirmed shared
 * across at least three Shacks Evolution titles, spec §4/§12):
 *
 *   Key = "1234567890poiuyioii".Substring(0, 16) = "1234567890poiuyi"  (UTF-8 bytes)
 *   IV  = "76d7c69d097c5689fd0622c33433b5de"  (interpreted as *hex*, 16 raw bytes)
 *   AesManaged defaults to CBC + PKCS7 padding.
 *   Encrypt() -> BitConverter.ToString(bytes).Replace("-", "") -> uppercase hex.
 *
 * These are shipped in the client bundle in the original build too (Unity
 * ships the same hardcoded constants in the compiled game) — this is wire
 * compatibility with the aggregator backend contract, not a secrecy boundary.
 * `server/crypto.js` is the Node-side byte-identical mirror of this file.
 */
const KEY_STRING = "1234567890poiuyi"; // first 16 UTF-8 bytes of "...poiuyioii"
const IV_HEX = "76d7c69d097c5689fd0622c33433b5de";

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

let keyPromise: Promise<CryptoKey> | null = null;

function importKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const keyBytes = new TextEncoder().encode(KEY_STRING);
    keyPromise = crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, [
      "encrypt",
      "decrypt",
    ]);
  }
  return keyPromise;
}

export async function encrypt(plainText: string): Promise<string> {
  const key = await importKey();
  const iv = hexToBytes(IV_HEX);
  const data = new TextEncoder().encode(plainText);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, data);
  return bytesToHex(cipherBuffer);
}

export async function decrypt(hexCipherText: string): Promise<string> {
  const key = await importKey();
  const iv = hexToBytes(IV_HEX);
  const cipherBytes = hexToBytes(hexCipherText);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, cipherBytes);
  return new TextDecoder().decode(plainBuffer);
}
