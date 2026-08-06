"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface CaptchaWidgetProps {
  provider?: string;
  turnstileSiteKey?: string | null;
  recaptchaSiteKey?: string | null;
  onVerify: (token: string) => void;
  actionName?: string;
}

export default function CaptchaWidget({
  provider = "none",
  turnstileSiteKey,
  recaptchaSiteKey,
  onVerify,
  actionName = "submit",
}: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  useEffect(() => {
    // ─────────────────────────────────────────────────────────────
    // 1. Turnstile Widget
    // ─────────────────────────────────────────────────────────────
    if (provider === "turnstile") {
      const siteKey = turnstileSiteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (!siteKey) return;

      const renderTurnstile = () => {
        if (window.turnstile && containerRef.current) {
          try {
            if (turnstileWidgetId.current) {
              window.turnstile.remove(turnstileWidgetId.current);
            }
            turnstileWidgetId.current = window.turnstile.render(containerRef.current, {
              sitekey: siteKey,
              theme: "dark",
              callback: (token: string) => onVerify(token),
              "expired-callback": () => onVerify(""),
              "error-callback": () => onVerify(""),
            });
          } catch (err) {
            console.error("[Turnstile render error]", err);
          }
        }
      };

      if (window.turnstile) {
        renderTurnstile();
      } else {
        const existingScript = document.getElementById("turnstile-script");
        if (!existingScript) {
          const script = document.createElement("script");
          script.id = "turnstile-script";
          script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          script.async = true;
          script.defer = true;
          script.onload = () => renderTurnstile();
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener("load", renderTurnstile);
        }
      }

      return () => {
        if (window.turnstile && turnstileWidgetId.current) {
          try {
            window.turnstile.remove(turnstileWidgetId.current);
          } catch {}
        }
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Google reCAPTCHA v3 Widget
    // ─────────────────────────────────────────────────────────────
    if (provider === "recaptcha_v3") {
      const siteKey = recaptchaSiteKey || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (!siteKey) return;

      const executeRecaptcha = () => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            window.grecaptcha
              ?.execute(siteKey, { action: actionName })
              .then((token) => onVerify(token))
              .catch((err) => console.error("[reCAPTCHA v3 error]", err));
          });
        }
      };

      const scriptId = `recaptcha-script-${siteKey}`;
      if (window.grecaptcha) {
        executeRecaptcha();
      } else {
        const existingScript = document.getElementById(scriptId);
        if (!existingScript) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
          script.async = true;
          script.defer = true;
          script.onload = () => executeRecaptcha();
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener("load", executeRecaptcha);
        }
      }
    }
  }, [provider, turnstileSiteKey, recaptchaSiteKey, actionName, onVerify]);

  if (provider === "turnstile") {
    return <div ref={containerRef} className="captcha-container my-2 flex justify-center" />;
  }

  if (provider === "recaptcha_v3") {
    return (
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center my-1">
        Protected by <span className="font-semibold text-emerald-400">Google reCAPTCHA v3</span>
      </div>
    );
  }

  return null;
}
