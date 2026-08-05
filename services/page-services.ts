import prisma from "@/lib/prisma";

export async function createSitePageInDB(data: {
  slug: string;
  title: string;
  content: string;
  is_active?: boolean;
  show_in_header?: boolean;
  show_in_footer?: boolean;
  sort_order?: number;
  meta_info?: object;
  theme_config?: object;
  components_config?: object;
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
    show_in_header?: boolean;
    show_in_footer?: boolean;
    sort_order?: number;
    meta_info?: object;
    theme_config?: object;
    components_config?: object;
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
