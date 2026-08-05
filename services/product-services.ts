import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface ProductGalleryImageServiceInput {
  id?: number;
  url: string;
  alt_text?: string | null;
  sort_order?: number;
}

export interface ProductVariantServiceInput {
  id?: number;
  name: string;
  sku?: string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  stock_quantity?: number;
  options?: Record<string, string>;
  image_url?: string | null;
  image_url_alt_text?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export async function createProductTransaction(
  data: {
    name: string;
    slug: string;
    description?: string | null;
    short_description?: string | null;
    feature_image_url?: string | null;
    feature_image_alt_text?: string | null;
    price: number;
    compare_at_price?: number | null;
    cost_price?: number | null;
    sku?: string | null;
    stock_quantity?: number;
    low_stock_threshold?: number;
    track_inventory?: boolean;
    weight?: number | null;
    dimensions?: object | null;
    category_id?: number | null;
    is_featured?: boolean;
    is_active?: boolean;
    sort_order?: number;
    meta_info?: object;
    gallery_images?: ProductGalleryImageServiceInput[];
    variants?: ProductVariantServiceInput[];
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const { gallery_images, variants, ...productFields } = data;

    const newProduct = await tx.product.create({
      data: {
        ...productFields,
        created_by: userId,
        updated_by: userId,
      } as Prisma.productUncheckedCreateInput,
    });

    if (gallery_images && gallery_images.length > 0) {
      await tx.product_image.createMany({
        data: gallery_images.map((img, idx) => ({
          product_id: newProduct.id,
          url: img.url,
          alt_text: img.alt_text || null,
          sort_order: img.sort_order ?? idx,
          created_by: userId,
          updated_by: userId,
        })),
      });
    }

    if (variants && variants.length > 0) {
      await tx.product_variant.createMany({
        data: variants.map((v, idx) => ({
          product_id: newProduct.id,
          name: v.name,
          sku: v.sku || null,
          price: v.price != null && v.price !== "" ? Number(v.price) : null,
          compare_at_price:
            v.compare_at_price != null && v.compare_at_price !== ""
              ? Number(v.compare_at_price)
              : null,
          stock_quantity: v.stock_quantity ?? 0,
          options: (v.options as any) ?? {},
          image_url: v.image_url || null,
          image_url_alt_text: v.image_url_alt_text || null,
          is_active: v.is_active ?? true,
          sort_order: v.sort_order ?? idx,
          created_by: userId,
          updated_by: userId,
        })),
      });
    }

    let categorySlug: string | null = null;
    if (newProduct.category_id) {
      const cat = await tx.category.findUnique({
        where: { id: newProduct.category_id },
        select: { slug: true },
      });
      categorySlug = cat?.slug || null;
    }

    return { product: newProduct, categorySlug };
  });
}

export async function updateProductTransaction(
  id: number,
  data: {
    name?: string;
    slug?: string;
    description?: string | null;
    short_description?: string | null;
    feature_image_url?: string | null;
    feature_image_alt_text?: string | null;
    price?: number;
    compare_at_price?: number | null;
    cost_price?: number | null;
    sku?: string | null;
    stock_quantity?: number;
    low_stock_threshold?: number;
    track_inventory?: boolean;
    weight?: number | null;
    dimensions?: object | null;
    category_id?: number | null;
    is_featured?: boolean;
    is_active?: boolean;
    sort_order?: number;
    meta_info?: object;
    gallery_images?: ProductGalleryImageServiceInput[];
    variants?: ProductVariantServiceInput[];
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: true,
        category: { select: { slug: true } },
      },
    });

    if (!existing) {
      throw new Error("Product not found.");
    }

    const removedMediaUrls: string[] = [];

    if (
      data.feature_image_url !== undefined &&
      data.feature_image_url !== existing.feature_image_url &&
      existing.feature_image_url
    ) {
      removedMediaUrls.push(existing.feature_image_url);
    }

    const { gallery_images, variants, ...productFields } = data;

    const updatedProduct = await tx.product.update({
      where: { id },
      data: {
        ...productFields,
        updated_by: userId,
      } as Prisma.productUncheckedUpdateInput,
    });

    if (gallery_images !== undefined) {
      const incomingIds = gallery_images
        .map((img) => img.id)
        .filter(Boolean) as number[];

      const deletedImages = existing.images.filter(
        (img) => !incomingIds.includes(img.id),
      );
      for (const img of deletedImages) {
        if (img.url) removedMediaUrls.push(img.url);
      }

      await tx.product_image.deleteMany({
        where: {
          product_id: id,
          id: { notIn: incomingIds },
        },
      });

      for (let idx = 0; idx < gallery_images.length; idx++) {
        const img = gallery_images[idx];
        if (img.id) {
          await tx.product_image.update({
            where: { id: img.id },
            data: {
              url: img.url,
              alt_text: img.alt_text || null,
              sort_order: img.sort_order ?? idx,
              updated_by: userId,
            },
          });
        } else {
          await tx.product_image.create({
            data: {
              product_id: id,
              url: img.url,
              alt_text: img.alt_text || null,
              sort_order: img.sort_order ?? idx,
              created_by: userId,
              updated_by: userId,
            },
          });
        }
      }
    }

    if (variants !== undefined) {
      const incomingVariantIds = variants
        .map((v) => v.id)
        .filter(Boolean) as number[];

      const deletedVariants = existing.variants.filter(
        (v) => !incomingVariantIds.includes(v.id),
      );
      for (const v of deletedVariants) {
        if (v.image_url) removedMediaUrls.push(v.image_url);
      }

      await tx.product_variant.deleteMany({
        where: {
          product_id: id,
          id: { notIn: incomingVariantIds },
        },
      });

      for (let idx = 0; idx < variants.length; idx++) {
        const v = variants[idx];
        const formattedPrice =
          v.price != null && v.price !== "" ? Number(v.price) : null;
        const formattedCompare =
          v.compare_at_price != null && v.compare_at_price !== ""
            ? Number(v.compare_at_price)
            : null;

        if (v.id) {
          const oldVariant = existing.variants.find((ev) => ev.id === v.id);
          if (
            oldVariant &&
            v.image_url !== undefined &&
            v.image_url !== oldVariant.image_url &&
            oldVariant.image_url
          ) {
            removedMediaUrls.push(oldVariant.image_url);
          }

          await tx.product_variant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              sku: v.sku || null,
              price: formattedPrice,
              compare_at_price: formattedCompare,
              stock_quantity: v.stock_quantity ?? 0,
              options: (v.options as any) ?? {},
              image_url: v.image_url || null,
              image_url_alt_text: v.image_url_alt_text || null,
              is_active: v.is_active ?? true,
              sort_order: v.sort_order ?? idx,
              updated_by: userId,
            },
          });
        } else {
          await tx.product_variant.create({
            data: {
              product_id: id,
              name: v.name,
              sku: v.sku || null,
              price: formattedPrice,
              compare_at_price: formattedCompare,
              stock_quantity: v.stock_quantity ?? 0,
              options: (v.options as any) ?? {},
              image_url: v.image_url || null,
              image_url_alt_text: v.image_url_alt_text || null,
              is_active: v.is_active ?? true,
              sort_order: v.sort_order ?? idx,
              created_by: userId,
              updated_by: userId,
            },
          });
        }
      }
    }

    let newCategorySlug: string | null = null;
    if (data.category_id && data.category_id !== existing.category_id) {
      const cat = await tx.category.findUnique({
        where: { id: data.category_id },
        select: { slug: true },
      });
      newCategorySlug = cat?.slug || null;
    }

    return {
      existing,
      updatedProduct,
      newCategorySlug,
      removedMediaUrls: Array.from(new Set(removedMediaUrls.filter(Boolean))),
    };
  });
}

export async function deleteProductTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        is_featured: true,
        category: { select: { slug: true } },
      },
    });

    if (!existing) throw new Error("Product not found.");

    await tx.product.update({
      where: { id },
      data: {
        updated_by: userId,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    return { existing };
  });
}

export async function restoreProductTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        is_featured: true,
        category: { select: { slug: true } },
      },
    });

    if (!existing) throw new Error("Product not found.");

    await tx.product.update({
      where: { id },
      data: {
        updated_by: userId,
        deleted_at: null,
        deleted_by: null,
      },
    });

    return { existing };
  });
}

export async function permanentlyDeleteProductTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: true,
        category: { select: { slug: true } },
      },
    });

    if (!existing) throw new Error("Product not found.");

    const removedMediaUrls: string[] = [];
    if (existing.feature_image_url) removedMediaUrls.push(existing.feature_image_url);
    for (const img of existing.images) {
      if (img.url) removedMediaUrls.push(img.url);
    }
    for (const v of existing.variants) {
      if (v.image_url) removedMediaUrls.push(v.image_url);
    }

    await tx.product_variant.deleteMany({ where: { product_id: id } });
    await tx.product_image.deleteMany({ where: { product_id: id } });
    await tx.product.delete({ where: { id } });

    return {
      existing,
      removedMediaUrls: Array.from(new Set(removedMediaUrls.filter(Boolean))),
    };
  });
}

export async function bulkDeleteProductsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.productWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.productWhereInput = selectAllScope
      ? (filterWhere ?? { deleted_at: null })
      : { id: { in: ids } };

    const affected = await tx.product.findMany({
      where: whereCondition,
      select: {
        id: true,
        slug: true,
        is_featured: true,
        category: { select: { slug: true } },
      },
    });

    await tx.product.updateMany({
      where: whereCondition,
      data: {
        updated_by: userId,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    return { affected };
  });
}

export async function bulkRestoreProductsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.productWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.productWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    const affected = await tx.product.findMany({
      where: whereCondition,
      select: {
        id: true,
        slug: true,
        is_featured: true,
        category: { select: { slug: true } },
      },
    });

    await tx.product.updateMany({
      where: whereCondition,
      data: {
        updated_by: userId,
        deleted_at: null,
        deleted_by: null,
      },
    });

    return { affected };
  });
}

export async function bulkPermanentlyDeleteProductsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.productWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.productWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    const affected = await tx.product.findMany({
      where: whereCondition,
      include: {
        images: true,
        variants: true,
        category: { select: { slug: true } },
      },
    });

    const affectedIds = affected.map((p) => p.id);
    const removedMediaUrls: string[] = [];

    for (const p of affected) {
      if (p.feature_image_url) removedMediaUrls.push(p.feature_image_url);
      for (const img of p.images) {
        if (img.url) removedMediaUrls.push(img.url);
      }
      for (const v of p.variants) {
        if (v.image_url) removedMediaUrls.push(v.image_url);
      }
    }

    if (affectedIds.length > 0) {
      await tx.product_variant.deleteMany({
        where: { product_id: { in: affectedIds } },
      });
      await tx.product_image.deleteMany({
        where: { product_id: { in: affectedIds } },
      });
      await tx.product.deleteMany({
        where: { id: { in: affectedIds } },
      });
    }

    return {
      affected,
      removedMediaUrls: Array.from(new Set(removedMediaUrls.filter(Boolean))),
    };
  });
}
