import prisma from "./prisma";

export interface VerifyCaptchaResult {
  success: boolean;
  error?: string;
}

/**
 * Server-side verification function for Cloudflare Turnstile and Google reCAPTCHA v3.
 * Reads the active provider setting from `site_config` in DB, and secret keys from environment variables.
 */
export async function verifyCaptchaToken(
  token?: string,
  remoteIp?: string,
): Promise<VerifyCaptchaResult> {
  try {
    const config = await prisma.site_config.findFirst({
      where: { deleted_at: null },
      select: { captcha_provider: true },
    });

    const provider = config?.captcha_provider || "none";

    // If CAPTCHA is disabled, bypass verification
    if (provider === "none") {
      return { success: true };
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Cloudflare Turnstile Verification
    // ─────────────────────────────────────────────────────────────
    if (provider === "turnstile") {
      const secretKey = process.env.TURNSTILE_SECRET_KEY;
      if (!secretKey) {
        console.warn("[CAPTCHA] TURNSTILE_SECRET_KEY is missing in environment variables. Bypassing verification.");
        return { success: true };
      }

      if (!token) {
        return {
          success: false,
          error: "CAPTCHA verification token is missing. Please complete the CAPTCHA.",
        };
      }

      const body = new URLSearchParams();
      body.append("secret", secretKey);
      body.append("response", token);
      if (remoteIp) body.append("remoteip", remoteIp);

      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body,
      });

      const data = await res.json();
      if (data.success) {
        return { success: true };
      }

      return {
        success: false,
        error: "Security verification failed (Cloudflare Turnstile). Please try again.",
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Google reCAPTCHA v3 Verification
    // ─────────────────────────────────────────────────────────────
    if (provider === "recaptcha_v3") {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      if (!secretKey) {
        console.warn("[CAPTCHA] RECAPTCHA_SECRET_KEY is missing in environment variables. Bypassing verification.");
        return { success: true };
      }

      if (!token) {
        return {
          success: false,
          error: "CAPTCHA verification token is missing.",
        };
      }

      const body = new URLSearchParams();
      body.append("secret", secretKey);
      body.append("response", token);
      if (remoteIp) body.append("remoteip", remoteIp);

      const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        body,
      });

      const data = await res.json();
      // Google reCAPTCHA v3 returns success boolean + risk score (0.0 - 1.0)
      if (data.success && typeof data.score === "number" && data.score >= 0.5) {
        return { success: true };
      }

      // If testing key or success true without score
      if (data.success && data.score === undefined) {
        return { success: true };
      }

      return {
        success: false,
        error: "Security check failed (Google reCAPTCHA v3). Please try again.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[CAPTCHA Error]", err);
    // On unexpected error, default to success so legit users aren't permanently blocked by network glitches
    return { success: true };
  }
}
