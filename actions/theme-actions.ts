"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  ThemeCreateInput,
  ThemeUpdateInput,
  ThemeBulkStatusInput,
  ThemeBulkDeleteInput,
  ThemeComponentCreateInput,
  ThemeComponentUpdateInput,
  ThemeComponentBulkStatusInput,
  ThemeComponentBulkDeleteInput,
  themeCreateSchema,
  themeUpdateSchema,
  themeBulkStatusSchema,
  themeBulkDeleteSchema,
  themeComponentCreateSchema,
  themeComponentUpdateSchema,
  themeComponentBulkStatusSchema,
  themeComponentBulkDeleteSchema,
} from "@/lib/validations";
import {
  createThemeInDB,
  updateThemeInDB,
  deleteThemePermanentlyInDB,
  bulkToggleThemesStatusInDB,
  bulkDeleteThemesPermanentlyInDB,
  createThemeComponentInDB,
  updateThemeComponentInDB,
  deleteThemeComponentPermanentlyInDB,
  bulkToggleThemeComponentsStatusInDB,
  bulkDeleteThemeComponentsPermanentlyInDB,
} from "@/services/theme-services";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Revalidates all theme and storefront caches impacted by theme/component mutations.
 */
function revalidateThemeCaches() {
  revalidateTag("themes", "max");
  revalidateTag("site-header", "max");
  revalidateTag("site-footer", "max");
  revalidateTag("home-page", "max");
  revalidateTag("site-pages", "max");
  revalidateTag("site-settings", "max");
  revalidatePath("/dashboard/themes");
}

// ─── THEMES ───────────────────────────────────────────────────────────────────

export async function createThemeAction(
  data: ThemeCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/themes");

  const validated = themeCreateSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid theme fields. Please correct highlighted errors.",
    };
  }

  try {
    const theme = await createThemeInDB(validated.data, Number(user.id));
    revalidateThemeCaches();

    await logActivity({
      action: "create_theme",
      entity_type: "theme",
      entity_id: theme.id,
      user,
      status: "SUCCESS",
      details: { name: theme.name, slug: theme.slug },
    });

    return {
      success: true,
      message: `Theme '${theme.name}' created successfully.`,
      data: theme,
    };
  } catch (error: any) {
    console.error("[createThemeAction]", error);
    await logActivity({
      action: "create_theme",
      entity_type: "theme",
      user,
      status: "FAILED",
      details: { name: data.name, error: error.message || String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to create theme.",
    };
  }
}

export async function updateThemeAction(
  id: number,
  data: ThemeUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid theme ID." };

  const validated = themeUpdateSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid theme fields. Please correct highlighted errors.",
    };
  }

  try {
    const updated = await updateThemeInDB(id, validated.data, Number(user.id));
    revalidateThemeCaches();

    await logActivity({
      action: "update_theme",
      entity_type: "theme",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { name: updated.name },
    });

    return {
      success: true,
      message: `Theme '${updated.name}' updated successfully.`,
      data: updated,
    };
  } catch (error: any) {
    console.error("[updateThemeAction]", error);
    await logActivity({
      action: "update_theme",
      entity_type: "theme",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: error.message || String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to update theme.",
    };
  }
}

export async function deleteThemeAction(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid theme ID." };

  try {
    const deleted = await deleteThemePermanentlyInDB(id);
    revalidateThemeCaches();

    await logActivity({
      action: "delete_theme",
      entity_type: "theme",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { name: deleted.name },
    });

    return {
      success: true,
      message: `Theme '${deleted.name}' deleted successfully.`,
    };
  } catch (error: any) {
    console.error("[deleteThemeAction]", error);
    await logActivity({
      action: "delete_theme",
      entity_type: "theme",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: error.message || String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to delete theme.",
    };
  }
}

export async function toggleThemeStatusAction(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid theme ID." };

  try {
    const updated = await updateThemeInDB(id, { is_active }, Number(user.id));
    revalidateThemeCaches();

    await logActivity({
      action: "toggle_theme_status",
      entity_type: "theme",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { name: updated.name, is_active },
    });

    return {
      success: true,
      message: `Theme '${updated.name}' ${is_active ? "activated" : "deactivated"} successfully.`,
      data: updated,
    };
  } catch (error: any) {
    console.error("[toggleThemeStatusAction]", error);
    return {
      success: false,
      message: error.message || "Failed to update theme status.",
    };
  }
}

export async function bulkUpdateThemesStatusAction(
  data: ThemeBulkStatusInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/themes");

  const validated = themeBulkStatusSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid bulk status update input.",
    };
  }

  try {
    await bulkToggleThemesStatusInDB(
      validated.data.ids,
      validated.data.is_active,
      Number(user.id),
    );
    revalidateThemeCaches();

    await logActivity({
      action: "bulk_toggle_theme_status",
      entity_type: "theme",
      user,
      status: "SUCCESS",
      details: {
        count: validated.data.ids.length,
        is_active: validated.data.is_active,
      },
    });

    return {
      success: true,
      message: `${validated.data.ids.length} theme(s) ${validated.data.is_active ? "activated" : "deactivated"} successfully.`,
    };
  } catch (error: any) {
    console.error("[bulkUpdateThemesStatusAction]", error);
    return {
      success: false,
      message: error.message || "Failed to update themes status.",
    };
  }
}

export async function bulkDeleteThemesAction(
  data: ThemeBulkDeleteInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/themes");

  const validated = themeBulkDeleteSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid bulk delete input.",
    };
  }

  try {
    await bulkDeleteThemesPermanentlyInDB(validated.data.ids);
    revalidateThemeCaches();

    await logActivity({
      action: "bulk_delete_themes",
      entity_type: "theme",
      user,
      status: "SUCCESS",
      details: { count: validated.data.ids.length, ids: validated.data.ids },
    });

    return {
      success: true,
      message: `${validated.data.ids.length} theme(s) deleted successfully.`,
    };
  } catch (error: any) {
    console.error("[bulkDeleteThemesAction]", error);
    return {
      success: false,
      message: error.message || "Failed to delete selected themes.",
    };
  }
}

// ─── THEME COMPONENTS ─────────────────────────────────────────────────────────

export async function createThemeComponentAction(
  data: ThemeComponentCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/themes");

  const validated = themeComponentCreateSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid component fields. Please correct highlighted errors.",
    };
  }

  try {
    const comp = await createThemeComponentInDB(validated.data, Number(user.id));
    revalidateThemeCaches();

    await logActivity({
      action: "create_theme_component",
      entity_type: "theme_component",
      entity_id: comp.id,
      user,
      status: "SUCCESS",
      details: {
        name: comp.name,
        theme_id: comp.theme_id,
        type: comp.component_type,
        file_path: comp.file_path,
      },
    });

    return {
      success: true,
      message: `Component '${comp.name}' registered successfully.`,
      data: comp,
    };
  } catch (error: any) {
    console.error("[createThemeComponentAction]", error);
    await logActivity({
      action: "create_theme_component",
      entity_type: "theme_component",
      user,
      status: "FAILED",
      details: { name: data.name, error: error.message || String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to register component.",
    };
  }
}

export async function updateThemeComponentAction(
  id: number,
  data: ThemeComponentUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid component ID." };

  const validated = themeComponentUpdateSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid component fields. Please correct highlighted errors.",
    };
  }

  try {
    const updated = await updateThemeComponentInDB(id, validated.data, Number(user.id));
    revalidateThemeCaches();

    await logActivity({
      action: "update_theme_component",
      entity_type: "theme_component",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { name: updated.name },
    });

    return {
      success: true,
      message: `Component '${updated.name}' updated successfully.`,
      data: updated,
    };
  } catch (error: any) {
    console.error("[updateThemeComponentAction]", error);
    await logActivity({
      action: "update_theme_component",
      entity_type: "theme_component",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: error.message || String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to update component.",
    };
  }
}

export async function deleteThemeComponentAction(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid component ID." };

  try {
    const deleted = await deleteThemeComponentPermanentlyInDB(id);
    revalidateThemeCaches();

    await logActivity({
      action: "delete_theme_component",
      entity_type: "theme_component",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { name: deleted.name },
    });

    return {
      success: true,
      message: `Component '${deleted.name}' deleted successfully.`,
    };
  } catch (error: any) {
    console.error("[deleteThemeComponentAction]", error);
    await logActivity({
      action: "delete_theme_component",
      entity_type: "theme_component",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: error.message || String(error) },
    });
    return {
      success: false,
      message: error.message || "Failed to delete component.",
    };
  }
}

export async function toggleThemeComponentStatusAction(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid component ID." };

  try {
    const updated = await updateThemeComponentInDB(id, { is_active }, Number(user.id));
    revalidateThemeCaches();

    await logActivity({
      action: "toggle_theme_component_status",
      entity_type: "theme_component",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { name: updated.name, is_active },
    });

    return {
      success: true,
      message: `Component '${updated.name}' ${is_active ? "activated" : "deactivated"} successfully.`,
      data: updated,
    };
  } catch (error: any) {
    console.error("[toggleThemeComponentStatusAction]", error);
    return {
      success: false,
      message: error.message || "Failed to update component status.",
    };
  }
}

export async function bulkUpdateThemeComponentsStatusAction(
  data: ThemeComponentBulkStatusInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/themes");

  const validated = themeComponentBulkStatusSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid bulk status update input.",
    };
  }

  try {
    await bulkToggleThemeComponentsStatusInDB(
      validated.data.ids,
      validated.data.is_active,
      Number(user.id),
    );
    revalidateThemeCaches();

    await logActivity({
      action: "bulk_toggle_theme_component_status",
      entity_type: "theme_component",
      user,
      status: "SUCCESS",
      details: {
        count: validated.data.ids.length,
        is_active: validated.data.is_active,
      },
    });

    return {
      success: true,
      message: `${validated.data.ids.length} component(s) ${validated.data.is_active ? "activated" : "deactivated"} successfully.`,
    };
  } catch (error: any) {
    console.error("[bulkUpdateThemeComponentsStatusAction]", error);
    return {
      success: false,
      message: error.message || "Failed to update components status.",
    };
  }
}

export async function bulkDeleteThemeComponentsAction(
  data: ThemeComponentBulkDeleteInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/themes");

  const validated = themeComponentBulkDeleteSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid bulk delete input.",
    };
  }

  try {
    await bulkDeleteThemeComponentsPermanentlyInDB(validated.data.ids);
    revalidateThemeCaches();

    await logActivity({
      action: "bulk_delete_theme_components",
      entity_type: "theme_component",
      user,
      status: "SUCCESS",
      details: { count: validated.data.ids.length, ids: validated.data.ids },
    });

    return {
      success: true,
      message: `${validated.data.ids.length} component(s) deleted successfully.`,
    };
  } catch (error: any) {
    console.error("[bulkDeleteThemeComponentsAction]", error);
    return {
      success: false,
      message: error.message || "Failed to delete selected components.",
    };
  }
}

// ─── BACKWARDS COMPATIBILITY ALIASES ──────────────────────────────────────────
export const createTheme = createThemeAction;
export const updateTheme = updateThemeAction;
export const deleteTheme = deleteThemeAction;
export const toggleThemeStatus = toggleThemeStatusAction;
export const createThemeComponent = createThemeComponentAction;
export const updateThemeComponent = updateThemeComponentAction;
export const deleteThemeComponent = deleteThemeComponentAction;
export const toggleThemeComponentStatus = toggleThemeComponentStatusAction;
