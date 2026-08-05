"use server";

import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  SitePageCreateInput,
  SitePageUpdateInput,
  sitePageCreateSchema,
  sitePageUpdateSchema,
} from "@/lib/validations";
import {
  createSitePageTransaction,
  updateSitePageTransaction,
  deleteSitePageTransaction,
  restoreSitePageTransaction,
  permanentlyDeleteSitePageTransaction,
} from "@/services/page-services";
import { revalidatePath, revalidateTag } from "next/cache";

function revalidatePageTags(slug: string) {
  if (slug === "/") {
    revalidateTag("home-page", "max");
  } else if (slug === "about") {
    revalidateTag("about-page", "max");
    revalidateTag("page-about", "max");
    revalidateTag("site-page-about", "max");
  } else {
    revalidateTag(`page-${slug}`, "max");
    revalidateTag(`site-page-${slug}`, "max");
  }
}

export async function createSitePage(
  data: SitePageCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/pages");

  const validatedFields = sitePageCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    slug,
    title,
    content,
    is_active,
    show_in_header,
    show_in_footer,
    sort_order,
    theme_config,
    components_config,
    meta_info,
  } = validatedFields.data;

  try {
    await createSitePageTransaction(
      {
        slug,
        title,
        content,
        is_active,
        show_in_header,
        show_in_footer,
        sort_order,
        theme_config,
        components_config,
        meta_info,
      },
      Number(user.id),
    );

    revalidateTag("site-pages", "max");
    revalidatePageTags(slug);
    if (show_in_header) revalidateTag("site-header", "max");
    if (show_in_footer) revalidateTag("site-footer", "max");

    revalidatePath("/dashboard/pages");

    return { success: true, message: "Page created successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create page." };
  }
}

export async function updateSitePage(
  id: number,
  data: SitePageUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/pages");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = sitePageUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    slug,
    title,
    content,
    is_active,
    show_in_header,
    show_in_footer,
    sort_order,
    theme_config,
    components_config,
    meta_info,
  } = validatedFields.data;

  try {
    const { existing, updated } = await updateSitePageTransaction(
      id,
      {
        slug,
        title,
        content,
        is_active,
        show_in_header,
        show_in_footer,
        sort_order,
        theme_config,
        components_config,
        meta_info,
      },
      Number(user.id),
    );

    revalidateTag("site-pages", "max");

    if (existing?.slug) revalidatePageTags(existing.slug);
    if (updated.slug && updated.slug !== existing?.slug) {
      revalidatePageTags(updated.slug);
    }

    const headerVisibilityChanged =
      show_in_header !== undefined && show_in_header !== existing?.show_in_header;
    const isHeaderRelevant = existing?.show_in_header || updated.show_in_header;
    const headerFieldsChanged =
      title !== undefined ||
      slug !== undefined ||
      sort_order !== undefined ||
      is_active !== undefined;
    if (headerVisibilityChanged || (isHeaderRelevant && headerFieldsChanged)) {
      revalidateTag("site-header", "max");
    }

    const footerVisibilityChanged =
      show_in_footer !== undefined && show_in_footer !== existing?.show_in_footer;
    const isFooterRelevant = existing?.show_in_footer || updated.show_in_footer;
    const footerFieldsChanged =
      title !== undefined ||
      slug !== undefined ||
      sort_order !== undefined ||
      is_active !== undefined;
    if (footerVisibilityChanged || (isFooterRelevant && footerFieldsChanged)) {
      revalidateTag("site-footer", "max");
    }

    revalidatePath("/dashboard/pages");
    revalidatePath(`/${updated.slug}`);

    return { success: true, message: "Page updated successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update page." };
  }
}

export async function deleteSitePage(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/pages");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await deleteSitePageTransaction(id, Number(user.id));

    revalidateTag("site-pages", "max");
    if (existing?.slug) revalidatePageTags(existing.slug);
    if (existing?.show_in_header) revalidateTag("site-header", "max");
    if (existing?.show_in_footer) revalidateTag("site-footer", "max");

    revalidatePath("/dashboard/pages");

    return { success: true, message: "Page deleted successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to delete page." };
  }
}

export async function restoreSitePage(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/pages");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await restoreSitePageTransaction(id, Number(user.id));

    revalidateTag("site-pages", "max");
    if (existing?.slug) revalidatePageTags(existing.slug);
    if (existing?.show_in_header) revalidateTag("site-header", "max");
    if (existing?.show_in_footer) revalidateTag("site-footer", "max");

    revalidatePath("/dashboard/pages");

    return { success: true, message: "Page restored successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to restore page." };
  }
}

export async function permanentlyDeleteSitePage(
  id: number,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/pages");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { existing } = await permanentlyDeleteSitePageTransaction(id);

    revalidateTag("site-pages", "max");
    if (existing?.slug) revalidatePageTags(existing.slug);
    if (existing?.show_in_header) revalidateTag("site-header", "max");
    if (existing?.show_in_footer) revalidateTag("site-footer", "max");

    revalidatePath("/dashboard/pages");

    return { success: true, message: "Page permanently deleted." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to permanently delete page." };
  }
}
