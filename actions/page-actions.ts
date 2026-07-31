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
  createSitePageInDB,
  updateSitePageInDB,
  deleteSitePagePermanentlyInDB,
} from "@/services/page-services";
import { revalidatePath, revalidateTag } from "next/cache";

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

  const { slug, title, content, is_active, meta_info } = validatedFields.data;

  try {
    await createSitePageInDB({
      slug,
      title,
      content,
      is_active,
      meta_info,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });

    revalidateTag("site-pages", "max");
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

  const { slug, title, content, is_active, meta_info } = validatedFields.data;

  try {
    const result = await updateSitePageInDB(id, {
      slug,
      title,
      content,
      is_active,
      meta_info,
      updated_by: Number(user.id),
    });

    revalidateTag("site-pages", "max");
    revalidateTag(`site-page-${result.slug}`, "max");
    revalidatePath("/dashboard/pages");
    revalidatePath(`/${result.slug}`);

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
    const result = await updateSitePageInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });

    revalidateTag("site-pages", "max");
    revalidateTag(`site-page-${result.slug}`, "max");
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
    const result = await updateSitePageInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });

    revalidateTag("site-pages", "max");
    revalidateTag(`site-page-${result.slug}`, "max");
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
    const result = await deleteSitePagePermanentlyInDB(id);

    revalidateTag("site-pages", "max");
    revalidateTag(`site-page-${result.slug}`, "max");
    revalidatePath("/dashboard/pages");

    return { success: true, message: "Page permanently deleted." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to permanently delete page." };
  }
}
