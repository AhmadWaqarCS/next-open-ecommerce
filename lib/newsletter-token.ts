import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const DEFAULT_EXPIRATION_HOURS = 24;

function getSecretKey(): Buffer {
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "next-open-ecommerce-newsletter-secret-key-fallback";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Generates an encrypted and signed token containing the target email address and an expiration timestamp.
 */
export function encryptNewsletterToken(
  email: string,
  expiresInHours: number = DEFAULT_EXPIRATION_HOURS,
): string {
  const secretKey = getSecretKey();
  const iv = crypto.randomBytes(12);

  const exp = Date.now() + expiresInHours * 60 * 60 * 1000;
  const payload = JSON.stringify({ email: email.trim().toLowerCase(), exp });

  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Combine iv (12B), tag (16B), and encrypted payload into a single Buffer
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64url");
}

/**
 * Decrypts and verifies a newsletter confirmation token.
 */
export function decryptNewsletterToken(
  token: string,
): { success: true; email: string } | { success: false; error: string } {
  try {
    if (!token) {
      return { success: false, error: "Verification token is missing." };
    }

    const secretKey = getSecretKey();
    const combined = Buffer.from(token, "base64url");

    // Must have at least 12B iv + 16B auth tag = 28 bytes
    if (combined.length < 28) {
      return { success: false, error: "Invalid verification token format." };
    }

    const iv = combined.subarray(0, 12);
    const tag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const payload = JSON.parse(decrypted.toString("utf8")) as {
      email?: string;
      exp?: number;
    };

    if (!payload.email || typeof payload.exp !== "number") {
      return { success: false, error: "Invalid token payload structure." };
    }

    if (Date.now() > payload.exp) {
      return {
        success: false,
        error: "Verification link has expired. Please submit your email again.",
      };
    }

    return { success: true, email: payload.email };
  } catch (error) {
    return {
      success: false,
      error: "Invalid or tampered verification link.",
    };
  }
}
