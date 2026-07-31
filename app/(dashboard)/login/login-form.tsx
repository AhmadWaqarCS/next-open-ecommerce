"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { UserLoginInput, userLoginSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { dashboardLogin } from "@/actions/user-actions";
import { setFormErrors } from "@/lib/client-utils";

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UserLoginInput>({
    resolver: zodResolver(userLoginSchema),
  });
  const onSubmit = (data: UserLoginInput) => {
    setGlobalError(null);
    startTransition(async () => {
      const response = await dashboardLogin(data);
      if (!response.success) {
        if (response.errors) setFormErrors(response.errors, setError);
        if (response.message) setGlobalError(response.message);
        return;
      }
    });
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {globalError && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{globalError}</span>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="admin@example.com"
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
              <svg className="h-3 w-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            Password
          </label>
          <input
            id="password"
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
            placeholder="••••••••"
            type="password"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
          />
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
              <svg className="h-3 w-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-lg shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Logging in...</span>
            </>
          ) : (
            "Login"
          )}
        </button>
      </form>
    </div>
  );
}
