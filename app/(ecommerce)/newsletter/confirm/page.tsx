import { Suspense } from "react";
import Link from "next/link";
import { confirmNewsletterSubscription } from "@/actions/newsletter-actions";
import { getPageThemeConfig } from "@/lib/storefront";
import { loadThemeComponent } from "@/lib/theme-loader";

export const metadata = {
  title: "Newsletter Subscription Confirmation",
  description: "Confirm your newsletter subscription.",
};

interface ConfirmationPageProps {
  searchParams: Promise<{ token?: string }>;
}

async function ConfirmationContent({ searchParams }: ConfirmationPageProps) {
  const { token } = await searchParams;

  let result: { success: boolean; message: string; email?: string } = {
    success: false,
    message: "Missing confirmation token.",
  };

  if (token) {
    result = await confirmNewsletterSubscription(token);
  }

  const pageThemeCfg = await getPageThemeConfig([
    "newsletter/confirm",
    "newsletter",
  ]);
  if (pageThemeCfg.theme_name && pageThemeCfg.component_path) {
    const CustomConfirm = await loadThemeComponent(
      pageThemeCfg.theme_name,
      pageThemeCfg.component_path,
    );
    if (CustomConfirm) {
      return (
        <>
          {pageThemeCfg.custom_css && (
            <style dangerouslySetInnerHTML={{ __html: pageThemeCfg.custom_css }} />
          )}
          <CustomConfirm
            result={result}
            token={token}
            themeConfig={pageThemeCfg.theme_config}
          />
        </>
      );
    }
  }

  return (
    <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md text-center relative overflow-hidden">
      {pageThemeCfg.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: pageThemeCfg.custom_css }} />
      )}
      {/* Subtle background glow */}
      <div
        className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          result.success ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      <div
        className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          result.success ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />

      {result.success ? (
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
            Subscription Confirmed!
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
            Thank you for subscribing
            {result.email ? (
              <>
                {" "}
                as <strong className="text-zinc-200">{result.email}</strong>
              </>
            ) : (
              ""
            )}
            . You will now receive our latest news, exclusive promotions, and
            updates directly in your inbox.
          </p>

          <div className="pt-4 w-full">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full bg-[var(--color-accent)] hover:brightness-110 text-zinc-950 font-bold px-6 py-3 rounded-full text-sm tracking-wide transition-all shadow-md active:scale-98"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
            Verification Failed
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
            {result.message}
          </p>

          <p className="text-xs text-zinc-500 max-w-xs">
            Please enter your email again in the newsletter form on our
            website to get a new confirmation link.
          </p>

          <div className="pt-4 w-full">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-6 py-3 rounded-full text-sm tracking-wide transition-all shadow-md active:scale-98"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewsletterConfirmationPage({ searchParams }: ConfirmationPageProps) {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Suspense fallback={<div className="text-zinc-400 text-sm">Verifying confirmation token...</div>}>
        <ConfirmationContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
