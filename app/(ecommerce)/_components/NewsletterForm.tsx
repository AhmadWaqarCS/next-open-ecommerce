"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletter } from "../../../actions/newsletter-actions";
import { useForm } from "react-hook-form";
import { EmailInput, EmailSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";

const initialState = { success: false, message: "" };

export default function NewsletterForm() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(initialState);

  const {
    register,
    handleSubmit,
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
      <div className="newsletter-success flex items-center gap-3 bg-emerald-950/40 border border-emerald-700/50 rounded-xl px-4 py-3.5">
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="email"
          {...register("email")}
          placeholder="your@email.com"
          disabled={isPending}
          className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 bg-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_85%,black)] text-zinc-900 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {isPending ? "…" : "Subscribe"}
        </button>
      </div>
      {state.message && !state.success && (
        <p className="text-red-400 text-xs">{state.message}</p>
      )}
      <p className="text-zinc-600 text-xs">No spam. Unsubscribe any time.</p>
    </form>
  );
}
