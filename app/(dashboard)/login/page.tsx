import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login - Dashboard",
  description: "Login to your account",
};

export default function DashboardLoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-zinc-100 to-zinc-200 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-xl animate-slide-up">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome Back
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Log in to manage your e-commerce store
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
