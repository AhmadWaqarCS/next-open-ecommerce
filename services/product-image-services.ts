import prisma from "@/lib/prisma";

export async function createProductImageInDB(data: {
  product_id: number;
  url: string;
  alt_text?: string | null;
  sort_order?: number;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.product_image.create({ data });
}

export async function createManyProductImagesInDB(data: {
  product_id: number;
  url: string;
  alt_text?: string | null;
  sort_order?: number;
  created_by: number;
  updated_by: number;
}[]) {
  return await prisma.product_image.createMany({ data });
}

export async function updateProductImageInDB(
  id: number,
  data: {
    url?: string;
    alt_text?: string | null;
    sort_order?: number;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.product_image.update({ where: { id }, data });
}

export async function deleteProductImagePermanentlyInDB(id: number) {
  return await prisma.product_image.delete({ where: { id } });
}

export async function syncProductImagesInDB(
  productId: number,
  incomingGallery: Array<{ id?: number; url: string; alt_text?: string | null; sort_order?: number }>,
  userId: number
) {
  const incomingIds = incomingGallery.map((img) => img.id).filter(Boolean) as number[];

  await prisma.product_image.deleteMany({
    where: {
      product_id: productId,
      id: { notIn: incomingIds },
    },
  });

  for (let idx = 0; idx < incomingGallery.length; idx++) {
    const img = incomingGallery[idx];
    if (img.id) {
      await prisma.product_image.update({
        where: { id: img.id },
        data: {
          url: img.url,
          alt_text: img.alt_text || null,
          sort_order: img.sort_order ?? idx,
          updated_by: userId,
        },
      });
    } else {
      await prisma.product_image.create({
        data: {
          product_id: productId,
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

export async function getProductImageForRevalidationInDB(id: number) {
  return await prisma.product_image.findUnique({
    where: { id },
    select: {
      id: true,
      product_id: true,
      product: {
        select: { slug: true },
      },
    },
  });
}

