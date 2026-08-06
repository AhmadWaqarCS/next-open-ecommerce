"use server";

import { ActionResponse, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import { toggleSitePageStatusTransaction } from "@/services/page-services";
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

export async function toggleSitePageStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/pages");

  if (id < 1) return { success: false, message: "Invalid page ID." };

  try {
    const { existing, updated } = await toggleSitePageStatusTransaction(
      id,
      is_active,
      Number(user.id),
    );

    revalidateTag("site-pages", "max");
    if (existing?.slug) revalidatePageTags(existing.slug);
    if (existing?.show_in_header) revalidateTag("site-header", "max");
    if (existing?.show_in_footer) revalidateTag("site-footer", "max");

    revalidatePath("/dashboard/pages");
    if (updated?.slug) revalidatePath(`/${updated.slug}`);

    await logActivity({
      action: "update_site_page",
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
      action: "update_site_page",
      entity_type: "site_page",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, is_active, error: String(error) },
    });
    return { success: false, message: "Failed to update page status." };
  }
}

