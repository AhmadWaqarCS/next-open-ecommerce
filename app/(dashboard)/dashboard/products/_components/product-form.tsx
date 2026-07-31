"use client";

import {
  createProduct,
  updateProduct,
  uploadProductImage,
} from "@/actions/product-actions";
import ImageField, {
  formatBytes,
} from "@/app/(dashboard)/_components/image-field";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import { product, product_image } from "@/lib/types";
import {
  ProductCreateInput,
  productCreateSchema,
  productUpdateSchema,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, DragEvent } from "react";
import { useForm, FieldErrors } from "react-hook-form";

interface ProductFormProps {
  initialData?: product & { images?: product_image[]; variants?: any[] };
  categories: { id: number; name: string }[];
}

type TabType =
  | "details"
  | "pricing"
  | "variations"
  | "gallery"
  | "shipping"
  | "seo";

export interface GalleryItem {
  id?: number;
  url: string;
  alt_text: string;
  file?: File | null;
  sort_order: number;
  previewUrl?: string;
}

export interface VariantItem {
  id?: number;
  name: string;
  sku: string;
  price: string | number;
  compare_at_price: string | number;
  stock_quantity: number;
  options: Record<string, string>;
  image_url: string;
  image_url_alt_text?: string;
  file?: File | null;
  is_active: boolean;
  sort_order: number;
}

export default function ProductForm({
  initialData,
  categories,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(isEdit);

  // Gallery items state
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => {
    if (initialData?.images && initialData.images.length > 0) {
      return [...initialData.images]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img) => ({
          id: img.id,
          url: img.url,
          alt_text: img.alt_text || "",
          sort_order: img.sort_order,
        }));
    }
    if (initialData?.feature_image_url) {
      return [
        {
          url: initialData.feature_image_url,
          alt_text: initialData.feature_image_alt_text || "",
          sort_order: 0,
        },
      ];
    }
    return [];
  });

  // Variant items state
  const [variantItems, setVariantItems] = useState<VariantItem[]>(() => {
    if (initialData?.variants && initialData.variants.length > 0) {
      return initialData.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku ?? "",
        price: v.price != null ? String(v.price) : "",
        compare_at_price:
          v.compare_at_price != null ? String(v.compare_at_price) : "",
        stock_quantity: v.stock_quantity ?? 0,
        options: (v.options as Record<string, string>) ?? {},
        image_url: v.image_url ?? "",
        image_url_alt_text: v.image_url_alt_text ?? "",
        is_active: v.is_active ?? true,
        sort_order: v.sort_order ?? 0,
      }));
    }
    return [];
  });

  // Option groups builder state
  const [optionGroups, setOptionGroups] = useState<
    { id: number; name: string; values: string }[]
  >([
    { id: 1, name: "Size", values: "S, M, L, XL" },
    { id: 2, name: "Color", values: "Red, Blue, Black" },
  ]);

  // Currently dragged index for smooth sorting
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { toast } = useToast();

  const meta = (initialData?.meta_info ?? {}) as Record<string, string>;
  const dims = (initialData?.dimensions ?? {}) as Record<string, number>;

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductCreateInput>({
    resolver: zodResolver(
      isEdit ? productUpdateSchema : productCreateSchema,
    ) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      short_description: initialData?.short_description ?? "",
      feature_image_url: initialData?.feature_image_url ?? "",
      feature_image_alt_text: initialData?.feature_image_alt_text ?? "",
      price: initialData?.price ? parseFloat(initialData.price) : 0,
      compare_at_price: initialData?.compare_at_price
        ? parseFloat(initialData.compare_at_price)
        : undefined,
      cost_price: initialData?.cost_price
        ? parseFloat(initialData.cost_price)
        : undefined,
      sku: initialData?.sku ?? "",
      stock_quantity: initialData?.stock_quantity ?? 0,
      low_stock_threshold: initialData?.low_stock_threshold ?? 5,
      track_inventory: initialData?.track_inventory ?? true,
      weight: initialData?.weight ? parseFloat(initialData.weight) : undefined,
      dimensions: {
        length: dims.length ? Number(dims.length) : undefined,
        width: dims.width ? Number(dims.width) : undefined,
        height: dims.height ? Number(dims.height) : undefined,
      },
      category_id: initialData?.category_id ?? undefined,
      is_featured: initialData?.is_featured ?? false,
      is_active: initialData?.is_active ?? true,
      sort_order: initialData?.sort_order ?? 0,
      meta_info: {
        title: meta.title || "",
        description: meta.description || "",
        keywords: meta.keywords || "",
      },
    },
  });

  const nameValue = watch("name");

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

  // Upload multiple files simultaneously (max 10 limit)
  const handleMultipleGalleryUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const currentCount = galleryItems.length;
    const remainingSlots = 10 - currentCount;

    if (remainingSlots <= 0) {
      toast("Maximum limit of 10 gallery images reached.", "error");
      return;
    }

    const filesArray = Array.from(files);
    if (filesArray.length > remainingSlots) {
      toast(
        `Only the first ${remainingSlots} image(s) were added (maximum limit is 10 images).`,
        "info",
      );
    }

    const filesToProcess = filesArray.slice(0, remainingSlots);

    const newItems: GalleryItem[] = filesToProcess.map((file, idx) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        url: "",
        alt_text: file.name.split(".")[0] || "Product image",
        file,
        previewUrl,
        sort_order: currentCount + idx,
      };
    });

    setGalleryItems((prev) => [...prev, ...newItems]);
  };

  const [itemSizes, setItemSizes] = useState<Record<string, number>>({});

  const handleAddExternalImageSlot = () => {
    if (galleryItems.length >= 10) {
      toast("Maximum limit of 10 gallery images reached.", "info");
      return;
    }
    setGalleryItems((prev) => [
      ...prev,
      {
        url: "",
        alt_text: "",
        sort_order: prev.length,
      },
    ]);
  };

  // Update specific gallery item
  const updateGalleryItem = (index: number, patch: Partial<GalleryItem>) => {
    setGalleryItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    );
  };

  // Remove gallery item
  const removeGalleryItem = (index: number) => {
    setGalleryItems((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((item, idx) => ({ ...item, sort_order: idx }));
    });
  };

  // Smooth Live-Reorder Drag and Drop Handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragEnter = (
    e: DragEvent<HTMLDivElement>,
    targetIndex: number,
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setGalleryItems((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setDraggedIndex(targetIndex);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDropToEnd = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === galleryItems.length - 1)
      return;

    setGalleryItems((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.push(movedItem);
      return updated.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setDraggedIndex(null);
  };

  // Variant management handlers
  const generateVariantCombinations = () => {
    const validGroups = optionGroups
      .map((g, gIdx) => ({
        name: g.name.trim() || `Option ${gIdx + 1}`,
        values: g.values
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((g) => g.values.length > 0);

    if (validGroups.length === 0) {
      toast("Please enter option values (e.g. S, M, L or Red, Blue).", "error");
      return;
    }

    const cartesian = (arrays: string[][]): string[][] =>
      arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])),
        [[]],
      );

    const groupValues = validGroups.map((g) => g.values);
    const combinations = cartesian(groupValues);

    const generated: VariantItem[] = combinations.map((combo, idx) => {
      const name = combo.join(" / ");
      const optionsBag: Record<string, string> = {};
      validGroups.forEach((g, gIdx) => {
        optionsBag[g.name] = combo[gIdx];
      });

      return {
        name,
        sku: "",
        price: "",
        compare_at_price: "",
        stock_quantity: 0,
        options: optionsBag,
        image_url: "",
        is_active: true,
        sort_order: idx,
      };
    });

    setVariantItems(generated);
    toast(`Generated ${generated.length} variant combinations.`, "success");
  };

  const addCustomVariant = () => {
    setVariantItems((prev) => [
      ...prev,
      {
        name: `Variant #${prev.length + 1}`,
        sku: "",
        price: "",
        compare_at_price: "",
        stock_quantity: 0,
        options: {},
        image_url: "",
        is_active: true,
        sort_order: prev.length,
      },
    ]);
  };

  const updateVariantItem = (index: number, patch: Partial<VariantItem>) => {
    setVariantItems((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, ...patch } : v)),
    );
  };

  const removeVariantItem = (index: number) => {
    setVariantItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onSubmit = (data: ProductCreateInput) => {
    setGlobalError(null);
    startTransition(async () => {
      setIsUploading(true);

      // 1. Upload any staged gallery image files
      const finalGalleryImages = [];
      for (const item of galleryItems) {
        let imageUrl = item.url;
        if (item.file) {
          const formData = new FormData();
          formData.append("file", item.file);
          const uploadRes = await uploadProductImage(formData);
          if (!uploadRes.success || !uploadRes.data?.relativePath) {
            toast(`Failed to upload image: ${item.file.name}`, "error");
            setGlobalError(`Failed to upload image: ${item.file.name}`);
            setIsUploading(false);
            return;
          }
          imageUrl = uploadRes.data.relativePath;
        }
        finalGalleryImages.push({
          id: item.id,
          url: imageUrl,
          alt_text: item.alt_text,
          sort_order: item.sort_order,
        });
      }

      setIsUploading(false);

      // 2. The first image in the gallery layout is ALWAYS the Primary Feature Image
      const firstImage = finalGalleryImages[0];
      const finalFeatureImageUrl = firstImage?.url || "";
      const finalFeatureImageAltText = firstImage?.alt_text || "";

      const finalVariants = [];
      for (let idx = 0; idx < variantItems.length; idx++) {
        const v = variantItems[idx];
        let vImageUrl = v.image_url;
        if (v.file) {
          const formData = new FormData();
          formData.append("file", v.file);
          const uploadRes = await uploadProductImage(formData);
          if (!uploadRes.success || !uploadRes.data?.relativePath) {
            toast(`Failed to upload variant image for: ${v.name}`, "error");
            setGlobalError(`Failed to upload variant image for: ${v.name}`);
            setIsUploading(false);
            return;
          }
          vImageUrl = uploadRes.data.relativePath;
        }

        finalVariants.push({
          id: v.id,
          name: v.name,
          sku: v.sku || null,
          price: v.price !== "" && v.price != null ? Number(v.price) : null,
          compare_at_price:
            v.compare_at_price !== "" && v.compare_at_price != null
              ? Number(v.compare_at_price)
              : null,
          stock_quantity: v.stock_quantity ?? 0,
          options: v.options ?? {},
          image_url: vImageUrl || null,
          image_url_alt_text: v.image_url_alt_text || null,
          is_active: v.is_active,
          sort_order: idx,
        });
      }

      const payload = {
        ...data,
        feature_image_url: finalFeatureImageUrl,
        feature_image_alt_text: finalFeatureImageAltText,
        gallery_images: finalGalleryImages,
        variants: finalVariants,
      };

      let response;
      if (isEdit && initialData) {
        response = await updateProduct(initialData.id, payload);
      } else {
        response = await createProduct(payload);
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

      toast(
        response.message ?? (isEdit ? "Product updated." : "Product created."),
        "success",
      );
      router.push("/dashboard/products");
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

  // Helper to check if a tab has validation errors
  const hasErrorsInTab = (tab: TabType): boolean => {
    if (tab === "details") {
      return Boolean(
        errors.name ||
        errors.slug ||
        errors.description ||
        errors.short_description ||
        errors.category_id,
      );
    }
    if (tab === "pricing") {
      return Boolean(
        errors.price ||
        errors.compare_at_price ||
        errors.cost_price ||
        errors.sku ||
        errors.stock_quantity ||
        errors.low_stock_threshold,
      );
    }
    if (tab === "gallery") {
      return Boolean(errors.feature_image_url || errors.feature_image_alt_text);
    }
    if (tab === "shipping") {
      return Boolean(errors.weight || errors.dimensions);
    }
    if (tab === "seo") {
      return Boolean(errors.meta_info);
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

      {/* Header Controls & Tabs */}
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
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>General Details</span>
            {hasErrorsInTab("details") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`whitespace-nowrap py-2.5 px-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "pricing"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Pricing &amp; Inventory</span>
            {hasErrorsInTab("pricing") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("variations")}
            className={`whitespace-nowrap py-2.5 px-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "variations"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Product Variations</span>
            {variantItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[10px]">
                {variantItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`whitespace-nowrap py-2.5 px-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "gallery"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Media &amp; Gallery</span>
            {hasErrorsInTab("gallery") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("shipping")}
            className={`whitespace-nowrap py-2.5 px-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "shipping"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Physical Attributes</span>
            {hasErrorsInTab("shipping") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("seo")}
            className={`whitespace-nowrap py-2.5 px-3 border-b-2 font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "seo"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>Meta &amp; SEO</span>
            {hasErrorsInTab("seo") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/products"
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending || isUploading}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
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
                ? "Uploading Images..."
                : isPending
                  ? "Saving Product..."
                  : isEdit
                    ? "Update Product"
                    : "Create Product"}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: GENERAL DETAILS */}
      {activeTab === "details" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div>
              <label
                htmlFor="prod-name"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="prod-name"
                type="text"
                placeholder="e.g. Wireless Noise-Canceling Headphones"
                {...register("name")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Product Slug */}
            <div>
              <label
                htmlFor="prod-slug"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                id="prod-slug"
                type="text"
                placeholder="wireless-noise-canceling-headphones"
                {...slugRegister}
                onChange={(e) => {
                  setIsSlugManuallyEdited(true);
                  slugRegister.onChange(e);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
              {errors.slug && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.slug.message}
                </p>
              )}
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label
              htmlFor="prod-category_id"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Category
            </label>
            <select
              id="prod-category_id"
              {...register("category_id", {
                setValueAs: (v) =>
                  v === "" || v === undefined ? undefined : Number(v),
              })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
            >
              <option value="">— Uncategorized —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.category_id.message}
              </p>
            )}
          </div>

          {/* Short Description */}
          <div>
            <label
              htmlFor="prod-short_description"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Short Description (Subtitle / Summary)
            </label>
            <input
              id="prod-short_description"
              type="text"
              placeholder="High-fidelity audio with active noise cancellation..."
              {...register("short_description")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
            />
            {errors.short_description && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.short_description.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="prod-description"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Full Description
            </label>
            <textarea
              id="prod-description"
              rows={5}
              placeholder="Detailed product features, specifications, and overview..."
              {...register("description")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Flags */}
          <div className="pt-2 flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("is_active")}
                className="w-4 h-4 rounded-sm text-indigo-600 border-zinc-300 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Active Product (Visible on storefront)
              </span>
            </label>

            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("is_featured")}
                className="w-4 h-4 rounded-sm text-indigo-600 border-zinc-300 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Featured Product (Hero / Featured Showcase)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* TAB 2: PRICING & INVENTORY */}
      {activeTab === "pricing" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price */}
            <div>
              <label
                htmlFor="prod-price"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="199.99"
                {...register("price", { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.price.message}
                </p>
              )}
            </div>

            {/* Compare-at Price */}
            <div>
              <label
                htmlFor="prod-compare_at_price"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Compare-at Price ($)
              </label>
              <input
                id="prod-compare_at_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="249.99"
                {...register("compare_at_price", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
              {errors.compare_at_price ? (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.compare_at_price.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Original / strike-through price
                </p>
              )}
            </div>

            {/* Cost Price */}
            <div>
              <label
                htmlFor="prod-cost_price"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Cost Price ($)
              </label>
              <input
                id="prod-cost_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="120.00"
                {...register("cost_price", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
              {errors.cost_price ? (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.cost_price.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Internal cost for profit calculations
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SKU */}
            <div>
              <label
                htmlFor="prod-sku"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                SKU (Stock Keeping Unit)
              </label>
              <input
                id="prod-sku"
                type="text"
                placeholder="PROD-HEAD-001"
                {...register("sku")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
              {errors.sku && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.sku.message}
                </p>
              )}
            </div>

            {/* Stock Quantity */}
            <div>
              <label
                htmlFor="prod-stock_quantity"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Stock Quantity
              </label>
              <input
                id="prod-stock_quantity"
                type="number"
                min="0"
                {...register("stock_quantity", { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
              {errors.stock_quantity && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.stock_quantity.message}
                </p>
              )}
            </div>

            {/* Low Stock Threshold */}
            <div>
              <label
                htmlFor="prod-low_stock_threshold"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Low Stock Threshold
              </label>
              <input
                id="prod-low_stock_threshold"
                type="number"
                min="0"
                {...register("low_stock_threshold", { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
              {errors.low_stock_threshold && (
                <p className="mt-1 text-xs text-red-500 font-medium">
                  {errors.low_stock_threshold.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("track_inventory")}
                className="w-4 h-4 rounded-sm text-indigo-600 border-zinc-300 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Track Inventory for this product
              </span>
            </label>

            <div>
              <label
                htmlFor="prod-sort_order"
                className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              >
                <span>Display Sort Order:</span>
                <input
                  id="prod-sort_order"
                  type="number"
                  {...register("sort_order", { valueAsNumber: true })}
                  className="w-20 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono text-center"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PRODUCT VARIATIONS */}
      {activeTab === "variations" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* SECTION 1: Automatic Variant Generator */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                  <span>Automatic Variant Generator</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Define option attributes (e.g. Size, Color) separated by
                  commas to generate all variant combinations automatically.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setOptionGroups((prev) => [
                      ...prev,
                      { id: Date.now(), name: "", values: "" },
                    ])
                  }
                  className="px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-xs"
                >
                  + Add Attribute
                </button>
                <button
                  type="button"
                  onClick={generateVariantCombinations}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>Generate Combinations</span>
                </button>
              </div>
            </div>

            {/* Option Groups List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {optionGroups.map((group, gIdx) => (
                <div
                  key={group.id}
                  className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Option #{gIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOptionGroups((prev) =>
                          prev.filter((_, idx) => idx !== gIdx),
                        )
                      }
                      className="text-[11px] font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Attribute Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Size or Color"
                        value={group.name}
                        onChange={(e) => {
                          const updated = [...optionGroups];
                          updated[gIdx].name = e.target.value;
                          setOptionGroups(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:outline-hidden font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Attribute Values (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Small, Medium, Large"
                        value={group.values}
                        onChange={(e) => {
                          const updated = [...optionGroups];
                          updated[gIdx].values = e.target.value;
                          setOptionGroups(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 focus:outline-hidden font-medium"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: Active Variants Editor Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Product Variants ({variantItems.length})</span>
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Configure price overrides, stock levels, and SKUs for each
                  variation.
                </p>
              </div>

              <button
                type="button"
                onClick={addCustomVariant}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <span>Add Custom Variant</span>
              </button>
            </div>

            {variantItems.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center bg-white dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-1">
                  No variants configured for this product.
                </p>
                <p className="text-xs text-zinc-400">
                  Use the Automatic Generator above or click &quot;Add Custom
                  Variant&quot;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 uppercase font-bold text-[10px] text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Variant Name</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Price ($)</th>
                      <th className="px-4 py-3">Compare Price ($)</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                    {variantItems.map((vItem, vIdx) => (
                      <tr
                        key={vIdx}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                      >
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={vItem.name}
                            onChange={(e) =>
                              updateVariantItem(vIdx, { name: e.target.value })
                            }
                            placeholder="e.g. Red / XL"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={vItem.sku}
                            onChange={(e) =>
                              updateVariantItem(vIdx, { sku: e.target.value })
                            }
                            placeholder="SKU"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={vItem.price}
                            onChange={(e) =>
                              updateVariantItem(vIdx, { price: e.target.value })
                            }
                            placeholder="Override"
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={vItem.compare_at_price}
                            onChange={(e) =>
                              updateVariantItem(vIdx, {
                                compare_at_price: e.target.value,
                              })
                            }
                            placeholder="Strike"
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min="0"
                            value={vItem.stock_quantity}
                            onChange={(e) =>
                              updateVariantItem(vIdx, {
                                stock_quantity: Number(e.target.value),
                              })
                            }
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs text-center"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={vItem.is_active}
                              onChange={(e) =>
                                updateVariantItem(vIdx, {
                                  is_active: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-indigo-600 rounded-sm border-zinc-300"
                            />
                            <span className="text-[11px] font-semibold">
                              Active
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeVariantItem(vIdx)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"
                            title="Remove variant"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 3: Variant Images & Media (at the bottom of the Variations tab page) */}
          {variantItems.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Variant Images</span>
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Upload specific showcase images for each product variant
                  below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {variantItems.map((vItem, vIdx) => (
                  <ImageField
                    key={vIdx}
                    label={`Image for ${vItem.name || `Variant #${vIdx + 1}`}`}
                    value={vItem.image_url}
                    onChange={(url) =>
                      updateVariantItem(vIdx, { image_url: url })
                    }
                    altValue={vItem.image_url_alt_text || ""}
                    onAltChange={(alt) =>
                      updateVariantItem(vIdx, { image_url_alt_text: alt })
                    }
                    onFileSelect={(file) => updateVariantItem(vIdx, { file })}
                    pendingFile={vItem.file}
                    uploadFolder="products/variants"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEDIA & GALLERY */}
      {activeTab === "gallery" && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* SECTION 1: Product Showcase Images & Inputs */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Gallery Images &amp; Input Fields</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold">
                    {galleryItems.length} / 10
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Maximum 10 images allowed per product. The{" "}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                    first image (#1)
                  </strong>{" "}
                  in sequence is automatically assigned as the{" "}
                  <strong className="text-amber-600 dark:text-amber-400 font-bold">
                    Primary Feature Image
                  </strong>
                  .
                </p>
              </div>

              {/* Upload Controls */}
              <div className="flex items-center gap-3 shrink-0">
                {galleryItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGalleryItems([])}
                    className="px-3.5 py-2 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-zinc-200 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-900/50 rounded-xl font-semibold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="w-4 h-4 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Remove All</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddExternalImageSlot}
                  disabled={galleryItems.length >= 10}
                  className={`px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-semibold text-xs text-zinc-700 dark:text-zinc-300 transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 ${
                    galleryItems.length >= 10
                      ? "opacity-50 pointer-events-none cursor-not-allowed"
                      : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  <span>+ Add Image Slot</span>
                </button>

                <label
                  className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-2 ${
                    galleryItems.length >= 10
                      ? "opacity-50 pointer-events-none cursor-not-allowed"
                      : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span>Upload Images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={galleryItems.length >= 10}
                    onChange={(e) =>
                      handleMultipleGalleryUpload(e.target.files)
                    }
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* List of ImageField Input Components in 2 Column Grid */}
            {galleryItems.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center bg-white dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  No images added yet. Click &quot;Upload Images&quot; above to
                  add showcase photos (max 10).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {galleryItems.map((item, index) => (
                  <ImageField
                    key={index}
                    label={
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-mono font-bold">
                          Image #{index + 1}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
                            ★ PRIMARY FEATURE IMAGE
                          </span>
                        )}
                      </div>
                    }
                    headerRight={
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(index)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400 cursor-pointer flex items-center gap-1"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <span>Remove</span>
                      </button>
                    }
                    value={item.url}
                    onChange={(url) => updateGalleryItem(index, { url })}
                    altValue={item.alt_text}
                    onAltChange={(alt) =>
                      updateGalleryItem(index, { alt_text: alt })
                    }
                    onFileSelect={(file) => updateGalleryItem(index, { file })}
                    pendingFile={item.file}
                    onSizeFetch={(sz) => {
                      const key = item.previewUrl || item.url;
                      if (key) {
                        setItemSizes((prev) =>
                          prev[key] === sz ? prev : { ...prev, [key]: sz },
                        );
                      }
                    }}
                    onPreviewFetch={(url) =>
                      updateGalleryItem(index, { previewUrl: url })
                    }
                    uploadFolder="products"
                    className={
                      index === 0
                        ? "border-amber-400 dark:border-amber-900/60 shadow-xs"
                        : ""
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: Gallery Preview & Sort Order (Smooth Animated Drag-and-Drop) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>
                  Gallery Preview &amp; Sort Order ({galleryItems.length}{" "}
                  {galleryItems.length === 1 ? "Image" : "Images"})
                </span>
                {(() => {
                  const totalBytes = galleryItems.reduce((acc, item) => {
                    if (item.file) return acc + item.file.size;
                    const key = item.previewUrl || item.url;
                    return acc + (itemSizes[key] || 0);
                  }, 0);
                  if (totalBytes > 0) {
                    return (
                      <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                        Total Size: {formatBytes(totalBytes)}
                      </span>
                    );
                  }
                  return null;
                })()}
              </h4>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Drag any card left or right to reorder. Images shift dynamically
                to create space.
              </span>
            </div>

            {galleryItems.length > 0 && (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              >
                {galleryItems.map((item, index) => {
                  const displayUrl = item.previewUrl;
                  const isFeature = index === 0;
                  const isBeingDragged = draggedIndex === index;

                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      className={`relative bg-white dark:bg-zinc-900 border rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-200 group shadow-xs select-none cursor-grab active:cursor-grabbing ${
                        isBeingDragged
                          ? "opacity-30 scale-95 border-dashed border-indigo-500 shadow-lg"
                          : isFeature
                            ? "border-amber-400 dark:border-amber-600/60 ring-2 ring-amber-400/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md"
                      }`}
                    >
                      {/* Top Bar: Sort Handle & Index Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isFeature
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          #{index + 1}
                        </span>

                        <div className="text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8h16M4 16h16"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Image Thumbnail */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 mb-2">
                        {displayUrl ? (
                          <Image
                            src={displayUrl}
                            alt={item.alt_text || `Gallery image ${index + 1}`}
                            fill
                            // unoptimized
                            className="object-cover pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs font-medium">
                            No Preview
                          </div>
                        )}

                        {isFeature && (
                          <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs tracking-wider">
                            FEATURE
                          </span>
                        )}
                      </div>

                      {/* Alt text hint / quick edit */}
                      <input
                        type="text"
                        placeholder="Alt text..."
                        value={item.alt_text}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateGalleryItem(index, { alt_text: val });
                        }}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 mb-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
                        <span className="text-zinc-400 font-mono">
                          Order {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeGalleryItem(index)}
                          className="font-semibold text-red-500 hover:text-red-700 dark:text-red-400 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Dedicated Drop Zone to Move Image to Far Right / End */}
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDropToEnd}
                  onDrop={handleDropToEnd}
                  className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-zinc-400 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors min-h-[160px] bg-zinc-50/50 dark:bg-zinc-900/30"
                >
                  <svg
                    className="w-5 h-5 mb-1 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    Drop here to move to end
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PHYSICAL ATTRIBUTES */}
      {activeTab === "shipping" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label
              htmlFor="prod-weight"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Weight (grams)
            </label>
            <input
              id="prod-weight"
              type="number"
              step="0.01"
              min="0"
              placeholder="450"
              {...register("weight", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="prod-dim-length"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Length (cm)
              </label>
              <input
                id="prod-dim-length"
                type="number"
                step="0.1"
                min="0"
                placeholder="20"
                {...register("dimensions.length", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="prod-dim-width"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Width (cm)
              </label>
              <input
                id="prod-dim-width"
                type="number"
                step="0.1"
                min="0"
                placeholder="15"
                {...register("dimensions.width", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="prod-dim-height"
                className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Height (cm)
              </label>
              <input
                id="prod-dim-height"
                type="number"
                step="0.1"
                min="0"
                placeholder="10"
                {...register("dimensions.height", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: META & SEO */}
      {activeTab === "seo" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label
              htmlFor="meta_title"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Meta Title
            </label>
            <input
              id="meta_title"
              type="text"
              placeholder="Custom Search Engine Title"
              {...register("meta_info.title")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="meta_description"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Meta Description
            </label>
            <textarea
              id="meta_description"
              rows={3}
              placeholder="Custom snippet for search engines..."
              {...register("meta_info.description")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="meta_keywords"
              className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Meta Keywords
            </label>
            <input
              id="meta_keywords"
              type="text"
              placeholder="headphones, wireless, audio, noise canceling"
              {...register("meta_info.keywords")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all text-sm"
            />
          </div>
        </div>
      )}
    </form>
  );
}
