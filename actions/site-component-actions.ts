"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  SiteComponentCreateInput,
  SiteComponentUpdateInput,
  siteComponentCreateSchema,
  siteComponentUpdateSchema,
} from "@/lib/validations";
import {
  createSiteComponentTransaction,
  updateSiteComponentTransaction,
  deleteSiteComponentTransaction,
  restoreSiteComponentTransaction,
  permanentlyDeleteSiteComponentTransaction,
  bulkDeleteSiteComponentsTransaction,
  bulkRestoreSiteComponentsTransaction,
  bulkPermanentlyDeleteSiteComponentsTransaction,
} from "@/services/site-component-services";
import { bulkDeleteMediaFilesFromStorage } from "@/services/media-services";
import { revalidatePath, revalidateTag } from "next/cache";

export async function createSiteComponent(
  data: SiteComponentCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission(
    "create",
    "/dashboard/site-components",
  );

  const validatedFields = siteComponentCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    component_key,
    category,
    description,
    default_props,
    thumbnail_url,
    is_active,
  } = validatedFields.data;

  try {
    await createSiteComponentTransaction(
      {
        name,
        component_key,
        category,
        description: description || null,
        default_props,
        thumbnail_url: thumbnail_url || null,
        is_active,
      },
      Number(user.id),
    );

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "create_site_component",
      entity_type: "site_component",
      entity_id: component_key,
      user,
      status: "SUCCESS",
      details: { name, component_key },
    });

    return { success: true, message: "Site component created successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "create_site_component",
      entity_type: "site_component",
      user,
      status: "FAILED",
      details: { name, component_key, error: String(error) },
    });
    return { success: false, message: "Failed to create site component." };
  }
}

export async function updateSiteComponent(
  id: number,
  data: SiteComponentUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission(
    "update",
    "/dashboard/site-components",
  );

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = siteComponentUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    component_key,
    category,
    description,
    default_props,
    thumbnail_url,
    is_active,
  } = validatedFields.data;

  try {
    const { removedMediaUrls } = await updateSiteComponentTransaction(
      id,
      {
        name,
        component_key,
        category,
        description: description !== undefined ? description || null : undefined,
        default_props,
        thumbnail_url:
          thumbnail_url !== undefined ? thumbnail_url || null : undefined,
        is_active,
      },
      Number(user.id),
    );

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "update_site_component",
      entity_type: "site_component",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name },
    });

    return { success: true, message: "Site component updated successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "update_site_component",
      entity_type: "site_component",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to update site component." };
  }
}

export async function deleteSiteComponent(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission(
    "delete",
    "/dashboard/site-components",
  );

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await deleteSiteComponentTransaction(id, Number(user.id));

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "delete_site_component",
      entity_type: "site_component",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Site component soft-deleted successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "delete_site_component",
      entity_type: "site_component",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete site component." };
  }
}

export async function restoreSiteComponent(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission(
    "update",
    "/dashboard/site-components",
  );

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    await restoreSiteComponentTransaction(id, Number(user.id));

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "restore_site_component",
      entity_type: "site_component",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Site component restored successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "restore_site_component",
      entity_type: "site_component",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to restore site component." };
  }
}

export async function permanentlyDeleteSiteComponent(
  id: number,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/site-components");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const { removedMediaUrls } =
      await permanentlyDeleteSiteComponentTransaction(id);

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "permanently_delete_site_component",
      entity_type: "site_component",
      entity_id: id,
      status: "SUCCESS",
      details: { id },
    });

    return { success: true, message: "Site component permanently deleted." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "permanently_delete_site_component",
      entity_type: "site_component",
      entity_id: id,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to permanently delete component." };
  }
}

export async function bulkSoftDeleteSiteComponents(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = false,
): Promise<ActionResponse> {
  const { user } = await assertPermission(
    "delete",
    "/dashboard/site-components",
  );

  try {
    await bulkDeleteSiteComponentsTransaction(
      ids,
      selectAllScope,
      isTrash,
      Number(user.id),
    );

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "bulk_delete_site_components",
      entity_type: "site_component",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected components moved to trash." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_delete_site_components",
      entity_type: "site_component",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to bulk delete components." };
  }
}

export async function bulkRestoreSiteComponents(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = true,
): Promise<ActionResponse> {
  const { user } = await assertPermission(
    "update",
    "/dashboard/site-components",
  );

  try {
    await bulkRestoreSiteComponentsTransaction(
      ids,
      selectAllScope,
      isTrash,
      Number(user.id),
    );

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "bulk_restore_site_components",
      entity_type: "site_component",
      user,
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected components restored." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_restore_site_components",
      entity_type: "site_component",
      user,
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to bulk restore components." };
  }
}

export async function bulkPermanentlyDeleteSiteComponents(
  ids: number[],
  selectAllScope: boolean = false,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/site-components");

  try {
    const { removedMediaUrls } =
      await bulkPermanentlyDeleteSiteComponentsTransaction(ids, selectAllScope);

    if (removedMediaUrls.length > 0) {
      await bulkDeleteMediaFilesFromStorage(removedMediaUrls);
    }

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "bulk_permanently_delete_site_components",
      entity_type: "site_component",
      status: "SUCCESS",
      details: { ids },
    });

    return { success: true, message: "Selected components permanently deleted." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "bulk_permanently_delete_site_components",
      entity_type: "site_component",
      status: "FAILED",
      details: { ids, error: String(error) },
    });
    return { success: false, message: "Failed to permanently delete components." };
  }
}
