// Node-side mirror of src/api/crypto.ts — must produce byte-identical output
// to interoperate with the same Unity `Crypto.cs` contract (spec §4). This is
// the exact same key/IV pair used by the sibling Penaldo/Keno ports (spec
// §4/§12: confirmed shared across at least three Shacks Evolution titles).
// AES-128-CBC/PKCS7 (Node's default padding for 'aes-128-cbc'), uppercase hex.
import crypto from "node:crypto";

const KEY = Buffer.from("1234567890poiuyi", "utf8"); // 16 bytes
const IV = Buffer.from("76d7c69d097c5689fd0622c33433b5de", "hex"); // 16 bytes

export function encrypt(plainText) {
  const cipher = crypto.createCipheriv("aes-128-cbc", KEY, IV);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return encrypted.toString("hex").toUpperCase();
}

export function decrypt(hexCipherText) {
  const decipher = crypto.createDecipheriv("aes-128-cbc", KEY, IV);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(hexCipherText, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
