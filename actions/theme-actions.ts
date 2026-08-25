"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  ThemeCreateInput,
  ThemeUpdateInput,
  ThemeComponentCreateInput,
  ThemeComponentUpdateInput,
  themeCreateSchema,
  themeUpdateSchema,
  themeComponentCreateSchema,
  themeComponentUpdateSchema,
} from "@/lib/validations";
import {
  createThemeInDB,
  updateThemeInDB,
  deleteThemePermanentlyInDB,
  createThemeComponentInDB,
  updateThemeComponentInDB,
  deleteThemeComponentPermanentlyInDB,
} from "@/services/theme-services";
import { revalidatePath, revalidateTag } from "next/cache";

// ─── THEMES ───────────────────────────────────────────────────────────────────

export async function createTheme(
  data: ThemeCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/themes");

  const validated = themeCreateSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid theme fields.",
    };
  }

  try {
    const theme = await createThemeInDB(validated.data, Number(user.id));

    revalidateTag("themes", "max");
    revalidatePath("/dashboard/themes");

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
    };
  } catch (error: any) {
    console.error(error);
    await logActivity({
      action: "create_theme",
      entity_type: "theme",
      user,
      status: "FAILED",
      details: { name: data.name, error: String(error) },
    });
    return {
      success: false,
      message: error?.code === "P2002" ? "Theme with this name or slug already exists." : "Failed to create theme.",
    };
  }
}

export async function updateTheme(
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
      message: "Invalid theme fields.",
    };
  }

  try {
    const updated = await updateThemeInDB(id, validated.data, Number(user.id));

    revalidateTag("themes", "max");
    revalidatePath("/dashboard/themes");

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
    };
  } catch (error: any) {
    console.error(error);
    await logActivity({
      action: "update_theme",
      entity_type: "theme",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return {
      success: false,
      message: error?.code === "P2002" ? "Theme name or slug already in use." : "Failed to update theme.",
    };
  }
}

export async function deleteTheme(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid theme ID." };

  try {
    const deleted = await deleteThemePermanentlyInDB(id);

    revalidateTag("themes", "max");
    revalidatePath("/dashboard/themes");

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
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "delete_theme",
      entity_type: "theme",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete theme." };
  }
}

export async function toggleThemeStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid theme ID." };

  try {
    const updated = await updateThemeInDB(id, { is_active }, Number(user.id));

    revalidateTag("themes", "max");
    revalidatePath("/dashboard/themes");

    await logActivity({
      action: "update_theme_status",
      entity_type: "theme",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { name: updated.name, is_active },
    });

    return {
      success: true,
      message: `Theme '${updated.name}' ${is_active ? "activated" : "deactivated"} successfully.`,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update theme status." };
  }
}

// ─── THEME COMPONENTS ─────────────────────────────────────────────────────────

export async function createThemeComponent(
  data: ThemeComponentCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/themes");

  const validated = themeComponentCreateSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      errors: formatZodErrors(validated.error),
      message: "Invalid component fields.",
    };
  }

  try {
    const comp = await createThemeComponentInDB(validated.data, Number(user.id));

    revalidateTag("themes", "max");
    revalidatePath("/dashboard/themes");

    await logActivity({
      action: "create_theme_component",
      entity_type: "theme_component",
      entity_id: comp.id,
      user,
      status: "SUCCESS",
      details: { name: comp.name, theme_id: comp.theme_id, type: comp.component_type },
    });

    return {
      success: true,
      message: `Component '${comp.name}' registered successfully.`,
    };
  } catch (error: any) {
    console.error(error);
    await logActivity({
      action: "create_theme_component",
      entity_type: "theme_component",
      user,
      status: "FAILED",
      details: { name: data.name, error: String(error) },
    });
    return {
      success: false,
      message: error?.code === "P2002" ? "This component file is already registered for this theme." : "Failed to register component.",
    };
  }
}

export async function updateThemeComponent(
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
      message: "Invalid component fields.",
    };
  }

  try {
    const updated = await updateThemeComponentInDB(id, validated.data, Number(user.id));

    revalidateTag("themes", "max");
    revalidatePath("/dashboard/themes");

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
    };
  } catch (error: any) {
    console.error(error);
    await logActivity({
      action: "update_theme_component",
      entity_type: "theme_component",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return {
      success: false,
      message: error?.code === "P2002" ? "Component file path collision within theme." : "Failed to update component.",
    };
  }
}

export async function deleteThemeComponent(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid component ID." };

  try {
    const deleted = await deleteThemeComponentPermanentlyInDB(id);

    revalidateTag("themes", "max");
    revalidatePath("/dashboard/themes");

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
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "delete_theme_component",
      entity_type: "theme_component",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to delete component." };
  }
}

export async function toggleThemeComponentStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/themes");
  if (id < 1) return { success: false, message: "Invalid component ID." };

  try {
    const updated = await updateThemeComponentInDB(id, { is_active }, Number(user.id));

    revalidateTag("themes", "max");
    revalidatePath("/dashboard/themes");

    await logActivity({
      action: "update_theme_component_status",
      entity_type: "theme_component",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { name: updated.name, is_active },
    });

    return {
      success: true,
      message: `Component '${updated.name}' ${is_active ? "activated" : "deactivated"} successfully.`,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update component status." };
  }
}
