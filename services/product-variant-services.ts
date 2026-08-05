import prisma from "@/lib/prisma";

export async function createProductVariantTransaction(
  data: {
    product_id: number;
    name: string;
    sku?: string | null;
    price?: number | null;
    compare_at_price?: number | null;
    stock_quantity?: number;
    options?: object;
    image_url?: string | null;
    image_url_alt_text?: string | null;
    is_active?: boolean;
    sort_order?: number;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const variant = await tx.product_variant.create({
      data: {
        ...data,
        options: data.options ?? {},
        created_by: userId,
        updated_by: userId,
      },
      include: {
        product: { select: { slug: true } },
      },
    });
    return variant;
  });
}

export async function updateProductVariantTransaction(
  id: number,
  data: {
    name?: string;
    sku?: string | null;
    price?: number | null;
    compare_at_price?: number | null;
    stock_quantity?: number;
    options?: object;
    image_url?: string | null;
    image_url_alt_text?: string | null;
    is_active?: boolean;
    sort_order?: number;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product_variant.findUnique({
      where: { id },
      include: { product: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Variant not found.");

    let removedMediaUrl: string | null = null;
    if (
      data.image_url !== undefined &&
      data.image_url !== existing.image_url &&
      existing.image_url
    ) {
      removedMediaUrl = existing.image_url;
    }

    const updated = await tx.product_variant.update({
      where: { id },
      data: {
        ...data,
        updated_by: userId,
      },
    });

    return { existing, updated, removedMediaUrl };
  });
}

export async function deleteProductVariantTransaction(
  id: number,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product_variant.findUnique({
      where: { id },
      include: { product: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Variant not found.");

    await tx.product_variant.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing };
  });
}

export async function restoreProductVariantTransaction(
  id: number,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product_variant.findUnique({
      where: { id },
      include: { product: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Variant not found.");

    await tx.product_variant.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing };
  });
}

export async function permanentlyDeleteProductVariantTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product_variant.findUnique({
      where: { id },
      include: { product: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Variant not found.");

    await tx.product_variant.delete({ where: { id } });

    return { existing, removedMediaUrl: existing.image_url };
  });
}
