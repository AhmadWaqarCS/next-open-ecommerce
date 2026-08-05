import prisma from "@/lib/prisma";

export async function createProductImageTransaction(
  data: {
    product_id: number;
    url: string;
    alt_text?: string | null;
    sort_order?: number;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const newImage = await tx.product_image.create({
      data: {
        ...data,
        created_by: userId,
        updated_by: userId,
      },
      include: {
        product: { select: { slug: true } },
      },
    });
    return newImage;
  });
}

export async function updateProductImageTransaction(
  id: number,
  data: {
    url?: string;
    alt_text?: string | null;
    sort_order?: number;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product_image.findUnique({
      where: { id },
      include: { product: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Image not found.");

    let removedMediaUrl: string | null = null;
    if (data.url !== undefined && data.url !== existing.url && existing.url) {
      removedMediaUrl = existing.url;
    }

    const updated = await tx.product_image.update({
      where: { id },
      data: { ...data, updated_by: userId },
    });

    return { existing, updated, removedMediaUrl };
  });
}

export async function deleteProductImageTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product_image.findUnique({
      where: { id },
      include: { product: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Image not found.");

    await tx.product_image.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing };
  });
}

export async function restoreProductImageTransaction(
  id: number,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product_image.findUnique({
      where: { id },
      include: { product: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Image not found.");

    await tx.product_image.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing };
  });
}

export async function permanentlyDeleteProductImageTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product_image.findUnique({
      where: { id },
      include: { product: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Image not found.");

    await tx.product_image.delete({ where: { id } });

    return { existing, removedMediaUrl: existing.url };
  });
}
