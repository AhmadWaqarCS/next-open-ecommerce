"use server";

import { ActionResponse, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import { toggleSiteComponentStatusTransaction } from "@/services/site-component-services";
import { revalidatePath, revalidateTag } from "next/cache";

export async function toggleSiteComponentStatus(
  id: number,
  is_active: boolean,
): Promise<ActionResponse> {
  const { user } = await assertPermission(
    "update",
    "/dashboard/site-components",
  );

  if (id < 1) return { success: false, message: "Invalid component ID." };

  try {
    const { updated } = await toggleSiteComponentStatusTransaction(
      id,
      is_active,
      Number(user.id),
    );

    revalidateTag("site-components", "max");
    revalidatePath("/dashboard/site-components");

    await logActivity({
      action: "update_site_component",
      entity_type: "site_component",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name: updated.name, is_active },
    });

    return {
      success: true,
      message: `${updated.name} ${is_active ? "enabled" : "disabled"} successfully.`,
    };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "update_site_component",
      entity_type: "site_component",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, is_active, error: String(error) },
    });
    return { success: false, message: "Failed to update component status." };
  }
}

