import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "Configuration Error: Neither ENCRYPTION_KEY nor AUTH_SECRET is set in environment variables."
    );
  }

  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Returns the encrypted_value, iv, and auth_tag as hex strings.
 */
export function encryptSecret(plainText: string): {
  encrypted_value: string;
  iv: string;
  auth_tag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encrypted_value: encrypted,
    iv: iv.toString("hex"),
    auth_tag: authTag,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload back to plain text string.
 */
export function decryptSecret(
  encrypted_value: string,
  ivHex: string,
  authTagHex: string
): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted_value, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
