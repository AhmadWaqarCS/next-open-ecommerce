"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  SitePageUpdateInput,
  sitePageUpdateSchema,
  sitePageStatusToggleSchema,
  bulkSetSitePagesStatusSchema,
} from "@/lib/validations";
import {
  updateSitePageTransaction,
  toggleSitePageStatusTransaction,
  bulkToggleSitePagesStatusTransaction,
} from "@/services/page-services";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  PageFilterParams,
  buildPageWhereInput,
} from "@/lib/filters/page-filters";

function revalidatePageTags(slug: string) {
  if (slug === "/") {
    revalidateTag("home-page", "max");
  } else if (slug === "about") {
    revalidateTag("about-page", "max");
    revalidateTag("page-about", "max");
    revalidateTag("site-page-about", "max");
  } else if (slug === "product" || slug === "products") {
    revalidateTag("products", "max");
  } else if (slug === "product/[slug]" || slug === "products/[slug]") {
    revalidateTag("products", "max");
  } else if (slug === "category" || slug === "categories") {
    revalidateTag("categories", "max");
  } else if (slug === "category/[slug]" || slug === "categories/[slug]") {
    revalidateTag("categories", "max");
  } else {
    revalidateTag(`page-${slug}`, "max");
    revalidateTag(`site-page-${slug}`, "max");
  }
}

export async function updateSitePage(
  id: number,
  data: SitePageUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/pages");

  if (id < 1) return { success: false, message: "Invalid page ID." };

  const validatedFields = sitePageUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Please correct the errors in the form.",
    };
  }

  const {
    title,
    content,
    custom_css,
    is_active,
    show_in_header,
    show_in_footer,
    sort_order,
    meta_info,
    theme_config,
  } = validatedFields.data;

  try {
    const { existing, updated } = await updateSitePageTransaction(
      id,
      {
        title,
        content: content !== undefined ? content || null : undefined,
        custom_css: custom_css !== undefined ? custom_css || null : undefined,
        is_active,
        show_in_header,
        show_in_footer,
        sort_order,
        meta_info,
        theme_config,
      },
      Number(user.id),
    );

    revalidateTag("site-pages", "max");
    revalidateTag("sitemap", "max");
    if (existing?.slug) revalidatePageTags(existing.slug);
    if (updated?.slug) revalidatePageTags(updated.slug);
    if (show_in_header !== undefined || existing?.show_in_header) {
      revalidateTag("site-header", "max");
    }
    if (show_in_footer !== undefined || existing?.show_in_footer) {
      revalidateTag("site-footer", "max");
    }

    revalidatePath("/dashboard/pages");
    if (existing?.slug) revalidatePath(`/${existing.slug}`);
    if (updated?.slug) revalidatePath(`/${updated.slug}`);

    await logActivity({
      action: "update_site_page",
      entity_type: "site_page",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: {
        id,
        slug: updated.slug,
        title: updated.title,
        updated_fields: Object.keys(validatedFields.data),
      },
    });

    return {
      success: true,
      message: `Page "${updated.title}" saved successfully.`,
    };
  } catch (error) {
    console.error("Error updating site page:", error);
    await logActivity({
      action: "update_site_page",
      entity_type: "site_page",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update page.",
    };
  }
}

export async function toggleSitePageStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/pages");

  const validated = sitePageStatusToggleSchema.safeParse({ id, is_active });
  if (!validated.success) {
    return { success: false, message: "Invalid status parameters." };
  }

  try {
    const { existing, updated } = await toggleSitePageStatusTransaction(
      id,
      is_active,
      Number(user.id),
    );

    revalidateTag("site-pages", "max");
    revalidateTag("sitemap", "max");
    if (existing?.slug) revalidatePageTags(existing.slug);
    if (existing?.show_in_header) revalidateTag("site-header", "max");
    if (existing?.show_in_footer) revalidateTag("site-footer", "max");

    revalidatePath("/dashboard/pages");
    if (updated?.slug) revalidatePath(`/${updated.slug}`);

    await logActivity({
      action: "toggle_site_page_status",
      entity_type: "site_page",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, title: updated.title, slug: updated.slug, is_active },
    });

    return {
      success: true,
      message: `${updated.title} ${is_active ? "enabled" : "disabled"} successfully.`,
    };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "toggle_site_page_status",
      entity_type: "site_page",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, is_active, error: String(error) },
    });
    return { success: false, message: "Failed to update page status." };
  }
}

export async function bulkToggleSitePages(
  ids: number[],
  is_active: boolean,
  selectAllScope: boolean = false,
  filterParams?: PageFilterParams,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/pages");

  const validated = bulkSetSitePagesStatusSchema.safeParse({
    ids,
    is_active,
    selectAllScope,
  });
  if (!validated.success) {
    return { success: false, message: "Invalid bulk status parameters." };
  }

  const filterWhere =
    selectAllScope && filterParams
      ? buildPageWhereInput(filterParams)
      : undefined;

  try {
    await bulkToggleSitePagesStatusTransaction(
      ids,
      is_active,
      selectAllScope,
      filterWhere,
      Number(user.id),
    );

    revalidateTag("site-pages", "max");
    revalidateTag("sitemap", "max");
    revalidateTag("site-header", "max");
    revalidateTag("site-footer", "max");
    revalidatePath("/dashboard/pages");

    await logActivity({
      action: "bulk_toggle_site_pages",
      entity_type: "site_page",
      user,
      status: "SUCCESS",
      details: { ids, is_active, selectAllScope },
    });

    return {
      success: true,
      message: `Selected pages ${is_active ? "enabled" : "disabled"} successfully.`,
    };
  } catch (error) {
    console.error("Error bulk toggling site pages:", error);
    await logActivity({
      action: "bulk_toggle_site_pages",
      entity_type: "site_page",
      user,
      status: "FAILED",
      details: { ids, is_active, error: String(error) },
    });
    return {
      success: false,
      message: "Failed to update selected pages.",
    };
  }
}

// Backward compatibility alias
export async function updateSitePageConfig(
  input: { id: number } & SitePageUpdateInput,
): Promise<ActionResponse> {
  const { id, ...rest } = input;
  return updateSitePage(id, rest);
}
