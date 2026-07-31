import prisma from "@/lib/prisma";

export async function createSitePageInDB(data: {
  slug: string;
  title: string;
  content: string;
  is_active?: boolean;
  meta_info?: object;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.site_page.create({ data });
}

export async function updateSitePageInDB(
  id: number,
  data: {
    slug?: string;
    title?: string;
    content?: string;
    is_active?: boolean;
    meta_info?: object;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.site_page.update({ where: { id }, data });
}

export async function deleteSitePagePermanentlyInDB(id: number) {
  return await prisma.site_page.delete({ where: { id } });
}
