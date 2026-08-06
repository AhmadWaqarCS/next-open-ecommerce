"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletter } from "../../../actions/newsletter-actions";
import { useForm } from "react-hook-form";
import { EmailInput, EmailSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import CaptchaWidget from "./CaptchaWidget";

const initialState = { success: false, message: "" };

export interface NewsletterFormProps {
  captchaProvider?: string;
  turnstileSiteKey?: string | null;
  recaptchaSiteKey?: string | null;
}

export default function NewsletterForm({
  captchaProvider = "none",
  turnstileSiteKey,
  recaptchaSiteKey,
}: NewsletterFormProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(initialState);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EmailInput>({
    resolver: zodResolver(EmailSchema),
  });

  const onSubmit = (data: EmailInput) => {
    startTransition(async () => {
      const response = await subscribeNewsletter(data);
      setState(response);
    });
  };

  if (state.success) {
    return (
      <div className="newsletter-success flex items-center gap-3 bg-emerald-950/60 border border-emerald-700/50 rounded-2xl px-4 py-3.5 shadow-lg">
        <svg
          className="w-5 h-5 text-emerald-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <p className="text-emerald-300 text-sm font-medium">{state.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2.5 w-full max-w-md">
      <div className="relative flex items-center w-full rounded-full bg-zinc-900 border border-zinc-800 p-1.5 focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-700/40 transition-all shadow-sm">
        <input
          type="email"
          {...register("email")}
          placeholder="Enter your email address"
          disabled={isPending}
          className="w-full bg-transparent pl-4 pr-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none disabled:opacity-50 min-w-0"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 bg-[var(--color-accent)] hover:brightness-110 text-zinc-950 font-bold px-5 py-2 rounded-full text-xs tracking-wider uppercase transition-all duration-200 disabled:opacity-60 whitespace-nowrap active:scale-95 shadow"
        >
          {isPending ? "…" : "Subscribe"}
        </button>
      </div>

      <CaptchaWidget
        provider={captchaProvider}
        turnstileSiteKey={turnstileSiteKey}
        recaptchaSiteKey={recaptchaSiteKey}
        actionName="newsletter_subscribe"
        onVerify={(token) => setValue("captcha_token", token)}
      />

      {errors.email && (
        <p className="text-red-400 text-xs px-3">{errors.email.message}</p>
      )}
      {state.message && !state.success && (
        <p className="text-red-400 text-xs px-3">{state.message}</p>
      )}
      <p className="text-zinc-500 text-[11px] px-3">
        No spam. Unsubscribe any time.
      </p>
    </form>
  );
}
