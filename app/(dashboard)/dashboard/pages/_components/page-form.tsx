"use client";

import { useState, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { updateSitePage } from "@/actions/page-actions";
import MetaInput from "@/app/(dashboard)/_components/meta-input";
import {
  SitePageUpdateInput,
  sitePageUpdateSchema,
} from "@/lib/validations";
import { CRUD } from "@/lib/types";

interface PageFormProps {
  initialData: any;
  permissions: CRUD;
}

export default function PageForm({ initialData, permissions }: PageFormProps) {
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(sitePageUpdateSchema),
    defaultValues: {
      title: initialData.title || "",
      slug: initialData.slug || "",
      content: initialData.content || "",
      is_active: initialData.is_active ?? true,
      show_in_header: initialData.show_in_header ?? false,
      show_in_footer: initialData.show_in_footer ?? true,
      sort_order: initialData.sort_order ?? 0,
      meta_info: {
        title: initialData.meta_info?.title || "",
        description: initialData.meta_info?.description || "",
        keywords: initialData.meta_info?.keywords || "",
        og_title: initialData.meta_info?.og_title || "",
        og_description: initialData.meta_info?.og_description || "",
        og_image: initialData.meta_info?.og_image || "",
      },
    },
  });

  const contentValue = watch("content");

  const insertTag = (openTag: string, closeTag: string, defaultText = "") => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end) || defaultText;
    const replacement = `${openTag}${selectedText}${closeTag}`;

    const newValue =
      el.value.substring(0, start) + replacement + el.value.substring(end);

    setValue("content", newValue, { shouldDirty: true, shouldValidate: true });

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + openTag.length,
        start + openTag.length + selectedText.length,
      );
    }, 0);
  };

  const { ref: contentRegisterRef, ...contentRegisterRest } =
    register("content");

  const onSubmit = (data: SitePageUpdateInput) => {
    if (!permissions.update) {
      toast("You do not have permission to update pages.", "error");
      return;
    }

    setGlobalError(null);
    startTransition(async () => {
      const response = await updateSitePage(initialData.id, data);
      if (!response.success) {
        if (response.message) setGlobalError(response.message);
        toast(response.message || "Failed to update page.", "error");
        return;
      }

      reset(data);
      toast("Page updated successfully.", "success");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {isDirty ? "Unsaved changes detected" : "Page content is up to date"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty || isPending}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              isDirty && !isPending
                ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
                : "text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-transparent"
            }`}
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={!isDirty || isPending || !permissions.update}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-md ${
              isDirty && permissions.update
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-[0.98]"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
            }`}
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving Changes...
              </>
            ) : (
              "Save Page"
            )}
          </button>
        </div>
      </div>

      {globalError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 font-medium"
        >
          {globalError}
        </div>
      )}

      {/* Main Content Form Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Page Information
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Edit content and settings for this static page. HTML tags are supported and rendered cleanly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Page Title *
            </label>
            <input
              type="text"
              disabled={!permissions.update}
              {...register("title")}
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm"
              placeholder="e.g. Terms & Conditions"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Page Slug (Read-only)
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm font-mono select-none">
              <span>/{initialData.slug}</span>
              <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                Seeded Route
              </span>
            </div>
          </div>

          {/* HTML Text Editor Container */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                HTML Content & Body *
              </label>

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-1 text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === "editor"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  HTML Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  Live Visual Preview
                </button>
              </div>
            </div>

            {activeTab === "editor" ? (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                {/* HTML Quick Formatting Toolbar */}
                {permissions.update && (
                  <div className="flex items-center gap-1.5 p-2 bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 flex-wrap text-xs">
                    <button
                      type="button"
                      onClick={() => insertTag("<h2>", "</h2>", "Section Heading")}
                      className="px-2.5 py-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 font-bold hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title="Insert Heading 2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag("<h3>", "</h3>", "Subheading")}
                      className="px-2.5 py-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 font-semibold hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title="Insert Heading 3"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag("<strong>", "</strong>", "Bold text")}
                      className="px-2.5 py-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 font-bold hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title="Insert Bold Text"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag("<em>", "</em>", "Italic text")}
                      className="px-2.5 py-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 italic hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title="Insert Italic Text"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag("<p>", "</p>", "Paragraph content...")}
                      className="px-2.5 py-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title="Insert Paragraph"
                    >
                      Paragraph
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertTag("<ul>\n  <li>", "</li>\n  <li>Item 2</li>\n</ul>", "Item 1")
                      }
                      className="px-2.5 py-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title="Insert Bullet List"
                    >
                      • Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertTag(
                          '<div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium">\n  ',
                          "\n</div>",
                          "Callout message or note...",
                        )
                      }
                      className="px-2.5 py-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title="Insert Callout Box"
                    >
                      Callout Box
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertTag('<a href="#">', "</a>", "Link text")
                      }
                      className="px-2.5 py-1 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title="Insert Hyperlink"
                    >
                      Link
                    </button>
                  </div>
                )}

                <textarea
                  disabled={!permissions.update}
                  rows={14}
                  {...contentRegisterRest}
                  ref={(e) => {
                    contentRegisterRef(e);
                    textareaRef.current = e;
                  }}
                  className="w-full p-4 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none text-sm font-mono leading-relaxed"
                  placeholder="Enter page text or HTML content..."
                />
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-zinc-50 dark:bg-zinc-950 min-h-[300px]">
                <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
                  {contentValue ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: contentValue }}
                    />
                  ) : (
                    <p className="text-zinc-400 italic">
                      No content to preview yet. Switch back to the HTML Editor to enter page body text.
                    </p>
                  )}
                </div>
              </div>
            )}

            {errors.content && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.content.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-1 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="is_active"
                disabled={!permissions.update}
                {...register("is_active")}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer"
              />
              <label
                htmlFor="is_active"
                className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
              >
                Page Active
              </label>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="show_in_header"
                disabled={!permissions.update}
                {...register("show_in_header")}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer"
              />
              <label
                htmlFor="show_in_header"
                className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
              >
                Show in Header
              </label>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="show_in_footer"
                disabled={!permissions.update}
                {...register("show_in_footer")}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer"
              />
              <label
                htmlFor="show_in_footer"
                className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
              >
                Show in Footer
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="sort_order"
                className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 shrink-0"
              >
                Sort Order:
              </label>
              <input
                type="number"
                id="sort_order"
                disabled={!permissions.update}
                {...register("sort_order", { valueAsNumber: true })}
                className="w-20 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-semibold"
              />
            </div>
          </div>
        </div>

        {/* SEO & OpenGraph Section */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <MetaInput
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            disabled={!permissions.update}
            uploadFolder="pages"
            defaultTitle={watch("title") || initialData.title}
          />
        </div>
      </div>
    </form>
  );
}
