import crypto from "crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const PIN_REGEX = /^\d{4}$/;

/** Validate that a PIN is exactly 4 digits */
export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

/** Hash a 4-digit PIN using scrypt with a random salt */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(pin, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return `${salt}:${key.toString("hex")}`;
}

/** Verify a PIN against a stored hash */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(pin, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), key);
}
