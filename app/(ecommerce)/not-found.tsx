import { Suspense } from "react";
import NotFoundActions from "./_components/NotFoundActions";

export default async function StorefrontNotFound() {
  return (
    <div className="min-h-[85vh] flex flex-col justify-between bg-zinc-900 text-white">
      <div className="flex-1 flex flex-col items-center justify-center pt-36 pb-20 px-4 text-center">
        <div className="max-w-xl w-full mx-auto">
          {/* Big 404 Numbers */}
          <div className="text-8xl sm:text-9xl font-black tracking-widest text-zinc-700/60 select-none leading-none">
            404
          </div>

          {/* Badge directly BENEATH the 404 numbers */}
          <div className="mt-4">
            <span className="inline-block px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/90 border border-indigo-800/60 rounded-full shadow-xs">
              Page Not Found
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            We couldn't find that page
          </h1>

          {/* Description */}
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
            The product, category, or page you are looking for might have been
            moved, removed, or is currently unavailable.
          </p>

          {/* Action Buttons wrapped in Suspense */}
          <div className="mt-10">
            <Suspense
              fallback={
                <div className="h-12 flex items-center justify-center gap-3">
                  <div className="w-32 h-11 bg-zinc-800 animate-pulse rounded-full" />
                  <div className="w-36 h-11 bg-zinc-800 animate-pulse rounded-full" />
                </div>
              }
            >
              <NotFoundActions />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
