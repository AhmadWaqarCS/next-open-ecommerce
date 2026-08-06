"use client";

import {
  createCategory,
  updateCategory,
  uploadCategoryImage,
} from "@/actions/category-actions";
import ImageInput from "@/app/(dashboard)/_components/image-input";
import ImageInputGroup from "@/app/(dashboard)/_components/image-input-group";
import MetaInput from "@/app/(dashboard)/_components/meta-input";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import { category } from "@/lib/types";
import {
  CategoryCreateInput,
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm, FieldErrors } from "react-hook-form";

interface CategoryFormProps {
  initialData?: category;
  parentCategories: { id: number; name: string }[];
}

type TabType = "details" | "meta" | "media";

const PRESET_GRADIENTS = [
  { label: "Dark Zinc", value: "from-zinc-800 to-zinc-950" },
  { label: "Amber Glow", value: "from-amber-900 to-amber-950" },
  { label: "Emerald Dark", value: "from-emerald-900 to-emerald-950" },
  { label: "Indigo Dusk", value: "from-indigo-900 to-indigo-950" },
  { label: "Rose Crimson", value: "from-rose-900 to-rose-950" },
  { label: "Violet Night", value: "from-violet-900 to-violet-950" },
  { label: "Cyan Deep", value: "from-cyan-900 to-cyan-950" },
];

export default function CategoryForm({
  initialData,
  parentCategories,
}: CategoryFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(isEdit);

  // Staged client file state (not uploaded until form submit)
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { toast } = useToast();

  const meta = (initialData?.meta_info ?? {}) as Record<string, string>;

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryCreateInput>({
    resolver: zodResolver(
      isEdit ? categoryUpdateSchema : categoryCreateSchema,
    ) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      image_alt_text: initialData?.image_alt_text ?? "",
      bg_color: initialData?.bg_color ?? "from-zinc-800 to-zinc-950",
      parent_id: initialData?.parent_id ?? undefined,
      sort_order: initialData?.sort_order ?? 0,
      is_active: initialData?.is_active ?? true,
      show_in_header: initialData?.show_in_header ?? true,
      show_in_footer: initialData?.show_in_footer ?? true,
      show_in_home: initialData?.show_in_home ?? true,
      meta_info: {
        title: meta.title || "",
        description: meta.description || "",
        keywords: meta.keywords || "",
        og_title: meta.og_title || "",
        og_description: meta.og_description || "",
        og_image: meta.og_image || "",
      },
    },
  });

  const nameValue = watch("name");
  const imageAltValue = watch("image_alt_text");
  const bgColorValue = watch("bg_color");

  // The current saved image URL — read-only, used only for preview display
  const currentImageUrl = initialData?.image_url ?? "";

  // Reset staged file state whenever initialData changes (e.g. after edit/save)
  useEffect(() => {
    setPendingFile(null);
  }, [initialData]);

  // Auto-generate slug dynamically as user types name unless manually edited
  useEffect(() => {
    if (!isSlugManuallyEdited && nameValue !== undefined) {
      const slugified = nameValue
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setValue("slug", slugified, { shouldValidate: true });
    }
  }, [nameValue, isSlugManuallyEdited, setValue]);

  const slugRegister = register("slug");

  const onSubmit = (data: CategoryCreateInput) => {
    setGlobalError(null);
    startTransition(async () => {
      let finalImageUrl = initialData?.image_url || "";

      // If a new pending file was chosen on the client, upload it now before saving category
      if (pendingFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", pendingFile);

        const uploadRes = await uploadCategoryImage(formData);
        setIsUploading(false);

        if (!uploadRes.success || !uploadRes.data?.relativePath) {
          toast(uploadRes.message ?? "Failed to save image to disk", "error");
          setGlobalError(uploadRes.message ?? "Failed to save image to disk");
          return;
        }

        finalImageUrl = uploadRes.data.relativePath;
      }

      const payload = { ...data, image_url: finalImageUrl };

      let response;
      if (isEdit && initialData) {
        response = await updateCategory(initialData.id, payload);
      } else {
        response = await createCategory(payload);
      }

      if (!response.success) {
        if (response.errors) {
          setFormErrors(response.errors, setError);
          const invalidFields = Object.keys(response.errors).map((fieldName) =>
            fieldName
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
          );
          if (invalidFields.length > 0) {
            setGlobalError(`Invalid fields: ${invalidFields.join(", ")}`);
          } else if (response.message) {
            setGlobalError(response.message);
          }
        } else if (response.message) {
          setGlobalError(response.message);
        }
        return;
      }

      setPendingFile(null);

      toast(
        response.message ??
          (isEdit ? "Category updated." : "Category created."),
        "success",
      );
      router.push("/dashboard/categories");
    });
  };

  const onInvalid = (formErrors: FieldErrors<any>) => {
    const invalidFields = Object.keys(formErrors).map((fieldName) =>
      fieldName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    );

    if (invalidFields.length > 0) {
      setGlobalError(`Invalid fields: ${invalidFields.join(", ")}`);
    } else {
      setGlobalError("Please fix validation errors in the form.");
    }
  };

  // Helper to check if a specific tab has validation errors
  const hasErrorsInTab = (tab: TabType): boolean => {
    if (tab === "details") {
      return Boolean(
        errors.name ||
          errors.slug ||
          errors.description ||
          errors.is_active ||
          errors.parent_id ||
          errors.sort_order,
      );
    }
    if (tab === "meta") {
      return Boolean(errors.meta_info);
    }
    if (tab === "media") {
      return Boolean(errors.image_alt_text || errors.bg_color);
    }
    return false;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {globalError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 font-medium"
        >
          {globalError}
        </div>
      )}

      {/* Tabs & Form Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 gap-4">
        <nav
          className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto"
          aria-label="Tabs"
        >
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`whitespace-nowrap py-2.5 px-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "details"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Category Details</span>
            {hasErrorsInTab("details") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("meta")}
            className={`whitespace-nowrap py-2.5 px-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "meta"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Meta &amp; SEO</span>
            {hasErrorsInTab("meta") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`whitespace-nowrap py-2.5 px-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "media"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Media &amp; Styling</span>
            {hasErrorsInTab("media") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/categories"
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending || isUploading}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
          >
            {(isPending || isUploading) && (
              <svg
                className="animate-spin -ml-1 mr-1 h-4 w-4 text-white"
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>
              {isUploading
                ? "Saving Image File..."
                : isPending
                  ? "Saving Category..."
                  : isEdit
                    ? "Update Category"
                    : "Create Category"}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: CATEGORY DETAILS */}
      {activeTab === "details" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Footwear, Electronics"
                {...register("name")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Category Slug */}
            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                id="slug"
                type="text"
                placeholder="footwear"
                {...slugRegister}
                onChange={(e) => {
                  setIsSlugManuallyEdited(true);
                  slugRegister.onChange(e);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm font-mono"
              />
              {errors.slug && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.slug.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parent Category */}
            <div>
              <label
                htmlFor="parent_id"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Parent Category (Optional)
              </label>
              <select
                id="parent_id"
                {...register("parent_id", {
                  setValueAs: (v) =>
                    v === "" || v === null ? undefined : Number(v),
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
              >
                <option value="">None (Top Level Category)</option>
                {parentCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.parent_id && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.parent_id.message}
                </p>
              )}
            </div>

            {/* Display Sort Order */}
            <div>
              <label
                htmlFor="sort_order"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Display Sort Order
              </label>
              <input
                id="sort_order"
                type="number"
                min={0}
                {...register("sort_order", { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Lower values display first on navigation menus and category listing pages.
              </p>
              {errors.sort_order && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.sort_order.message}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Brief summary of products in this category..."
              {...register("description")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Active Status & Visibility Options */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("is_active")}
                className="w-4 h-4 rounded-sm text-emerald-600 border-zinc-300 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Active Category
              </span>
            </label>

            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("show_in_header")}
                className="w-4 h-4 rounded-sm text-emerald-600 border-zinc-300 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Show in Header
              </span>
            </label>

            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("show_in_footer")}
                className="w-4 h-4 rounded-sm text-emerald-600 border-zinc-300 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Show in Footer
              </span>
            </label>

            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("show_in_home")}
                className="w-4 h-4 rounded-sm text-emerald-600 border-zinc-300 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Show on Home
              </span>
            </label>
          </div>
        </div>
      )}

      {/* TAB 2: META & SEO */}
      {activeTab === "meta" && (
        <div className="animate-in fade-in duration-150">
          <MetaInput
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            uploadFolder="categories"
            defaultTitle={nameValue || initialData?.name}
            defaultDescription={watch("description") || initialData?.description}
          />
        </div>
      )}

      {/* TAB 3: MEDIA & STYLING */}
      {activeTab === "media" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Category Image Field */}
          <ImageInputGroup
            title="Category Media"
            description="Upload or specify the featured showcase image for this category."
          >
            <ImageInput
              label="Category Image File & Details"
              value={currentImageUrl}
              altValue={imageAltValue || ""}
              onAltChange={(alt) =>
                setValue("image_alt_text", alt, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              file={pendingFile}
              onFileSelect={(file) => {
                setPendingFile(file);
                if (file) {
                  toast(
                    "Image staged. It will be saved when you submit the category.",
                    "info",
                  );
                }
              }}
              error={errors.image_alt_text?.message}
              altError={errors.image_alt_text?.message}
              uploadFolder="categories"
              showAltField={true}
            />
          </ImageInputGroup>

          {/* Background Styling Picker */}
          <div className="space-y-3 pt-2">
            <label
              htmlFor="bg_color"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Storefront Background / Styling (Tailwind CSS Classes)
            </label>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESET_GRADIENTS.map((preset) => (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() =>
                    setValue("bg_color", preset.value, { shouldValidate: true })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    bgColorValue === preset.value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              id="bg_color"
              type="text"
              placeholder="from-zinc-800 to-zinc-950 or bg-emerald-900"
              {...register("bg_color")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm font-mono"
            />
          </div>

          {/* Live Preview Card */}
          <div className="pt-2">
            <span className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Storefront Preview Banner
            </span>
            <div
              className={`relative overflow-hidden rounded-2xl p-6 ${
                bgColorValue?.includes("bg-")
                  ? bgColorValue
                  : `bg-gradient-to-r ${bgColorValue || "from-zinc-800 to-zinc-950"}`
              } text-white shadow-md flex items-center justify-between min-h-[120px]`}
            >
              <div>
                <span className="text-xs uppercase tracking-widest font-extrabold opacity-75">
                  Category
                </span>
                <h4 className="text-xl font-black mt-0.5">
                  {nameValue || "Category Name"}
                </h4>
                <p className="text-xs opacity-80 mt-1 max-w-md line-clamp-2">
                  {watch("description") ||
                    "Category description will appear here on storefront banner..."}
                </p>
              </div>

              {(pendingFile ? URL.createObjectURL(pendingFile) : currentImageUrl) && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-black/20">
                  <Image
                    src={pendingFile ? URL.createObjectURL(pendingFile) : currentImageUrl}
                    alt={
                      imageAltValue || nameValue || "Category banner preview"
                    }
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
