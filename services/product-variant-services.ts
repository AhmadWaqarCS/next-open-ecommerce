import prisma from "@/lib/prisma";

export async function createProductVariantInDB(data: {
  product_id: number;
  name: string;
  sku?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  stock_quantity?: number;
  options: object;
  image_url?: string | null;
  image_url_alt_text?: string | null;
  is_active?: boolean;
  sort_order?: number;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.product_variant.create({ data });
}

export async function createManyProductVariantsInDB(data: {
  product_id: number;
  name: string;
  sku?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  stock_quantity?: number;
  options: any;
  image_url?: string | null;
  image_url_alt_text?: string | null;
  is_active?: boolean;
  sort_order?: number;
  created_by: number;
  updated_by: number;
}[]) {
  return await prisma.product_variant.createMany({ data });
}

export async function updateProductVariantInDB(
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
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.product_variant.update({ where: { id }, data });
}

export async function deleteProductVariantPermanentlyInDB(id: number) {
  return await prisma.product_variant.delete({ where: { id } });
}

export async function syncProductVariantsInDB(
  productId: number,
  incomingVariants: Array<{
    id?: number;
    name: string;
    sku?: string | null;
    price?: number | string | null;
    compare_at_price?: number | string | null;
    stock_quantity?: number;
    options?: any;
    image_url?: string | null;
    image_url_alt_text?: string | null;
    is_active?: boolean;
    sort_order?: number;
  }>,
  userId: number
) {
  const incomingVarIds = incomingVariants
    .map((v) => v.id)
    .filter(Boolean) as number[];

  await prisma.product_variant.deleteMany({
    where: {
      product_id: productId,
      id: { notIn: incomingVarIds },
    },
  });

  for (let idx = 0; idx < incomingVariants.length; idx++) {
    const v = incomingVariants[idx];
    const priceVal =
      v.price != null && v.price !== "" ? Number(v.price) : null;
    const comparePriceVal =
      v.compare_at_price != null && v.compare_at_price !== ""
        ? Number(v.compare_at_price)
        : null;

    if (v.id) {
      await prisma.product_variant.update({
        where: { id: v.id },
        data: {
          name: v.name,
          sku: v.sku || null,
          price: priceVal,
          compare_at_price: comparePriceVal,
          stock_quantity: v.stock_quantity ?? 0,
          options: v.options ?? {},
          image_url: v.image_url || null,
          image_url_alt_text: v.image_url_alt_text || null,
          is_active: v.is_active ?? true,
          sort_order: v.sort_order ?? idx,
          updated_by: userId,
        },
      });
    } else {
      await prisma.product_variant.create({
        data: {
          product_id: productId,
          name: v.name,
          sku: v.sku || null,
          price: priceVal,
          compare_at_price: comparePriceVal,
          stock_quantity: v.stock_quantity ?? 0,
          options: v.options ?? {},
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
