"use server";

import { ActionResponse, formatZodErrors, logActivity } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  SiteConfigCreateInput,
  SiteConfigUpdateInput,
  siteConfigCreateSchema,
  siteConfigUpdateSchema,
} from "@/lib/validations";
import {
  createSiteConfigTransaction,
  updateSiteConfigTransaction,
} from "@/services/site-services";
import { revalidatePath, revalidateTag } from "next/cache";

// ─── SITE CONFIG ──────────────────────────────────────────────────────────────

export async function createSiteConfig(
  data: SiteConfigCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/settings");

  const validatedFields = siteConfigCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    tagline,
    description,
    site_url,
    light_logo_url,
    dark_logo_url,
    favicon_url,
    primary_color,
    secondary_color,
    accent_color,
    currency,
    currency_symbol,
    email,
    phone,
    address,
    social_links,
    business_name,
    business_registration_number,
    tax_rate,
    tax_inclusive,
    tax_label,
    require_phone,
    allow_order_notes,
    meta_info,
    topbar_message,
  } = validatedFields.data;

  try {
    await createSiteConfigTransaction(
      {
        name,
        tagline: tagline || null,
        description: description || null,
        site_url: site_url || null,
        topbar_message: topbar_message || null,
        light_logo_url: light_logo_url || null,
        dark_logo_url: dark_logo_url || null,
        favicon_url: favicon_url || null,
        primary_color,
        secondary_color,
        accent_color,
        currency,
        currency_symbol,
        email: email || null,
        phone: phone || null,
        address: address || null,
        social_links,
        business_name: business_name || null,
        business_registration_number: business_registration_number || null,
        tax_rate: tax_rate ?? null,
        tax_inclusive,
        tax_label,
        require_phone,
        allow_order_notes,
        meta_info,
      },
      Number(user.id),
    );
    revalidateTag("site-config", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/settings");

    await logActivity({
      action: "create_site_config",
      entity_type: "site_config",
      user,
      status: "SUCCESS",
      details: { name },
    });

    return { success: true, message: "Site config created successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "create_site_config",
      entity_type: "site_config",
      user,
      status: "FAILED",
      details: { name, error: String(error) },
    });
    return { success: false, message: "Failed to create site config." };
  }
}

export async function updateSiteConfig(
  id: number,
  data: SiteConfigUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/settings");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = siteConfigUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    tagline,
    description,
    site_url,
    light_logo_url,
    dark_logo_url,
    favicon_url,
    primary_color,
    secondary_color,
    accent_color,
    currency,
    currency_symbol,
    email,
    phone,
    address,
    social_links,
    business_name,
    business_registration_number,
    tax_rate,
    tax_inclusive,
    tax_label,
    require_phone,
    allow_order_notes,
    meta_info,
    topbar_message,
  } = validatedFields.data;

  try {
    const { existing, updated } =
      await updateSiteConfigTransaction(
      id,
      {
        name,
        tagline: tagline !== undefined ? tagline || null : undefined,
        description: description !== undefined ? description || null : undefined,
        site_url: site_url !== undefined ? site_url || null : undefined,
        topbar_message:
          topbar_message !== undefined ? topbar_message || null : undefined,
        light_logo_url:
          light_logo_url !== undefined ? light_logo_url || null : undefined,
        dark_logo_url:
          dark_logo_url !== undefined ? dark_logo_url || null : undefined,
        favicon_url: favicon_url !== undefined ? favicon_url || null : undefined,
        primary_color,
        secondary_color,
        accent_color,
        currency,
        currency_symbol,
        email: email !== undefined ? email || null : undefined,
        phone: phone !== undefined ? phone || null : undefined,
        address: address !== undefined ? address || null : undefined,
        social_links,
        business_name,
        business_registration_number,
        tax_rate: tax_rate !== undefined ? (tax_rate ?? null) : undefined,
        tax_inclusive,
        tax_label,
        require_phone,
        allow_order_notes,
        meta_info,
      },
      Number(user.id),
    );

    revalidateTag("site-config", "max");

    const headerChanged =
      name !== undefined ||
      light_logo_url !== undefined ||
      dark_logo_url !== undefined ||
      topbar_message !== undefined;
    if (headerChanged) revalidateTag("site-header", "max");

    const footerChanged =
      name !== undefined ||
      description !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      address !== undefined ||
      social_links !== undefined;
    if (footerChanged) revalidateTag("site-footer", "max");

    const heroChanged =
      tagline !== undefined ||
      description !== undefined ||
      accent_color !== undefined ||
      primary_color !== undefined;
    if (heroChanged) revalidateTag("hero-banner", "max");

    const checkoutChanged =
      currency !== undefined ||
      currency_symbol !== undefined ||
      require_phone !== undefined ||
      allow_order_notes !== undefined ||
      tax_rate !== undefined ||
      tax_inclusive !== undefined ||
      tax_label !== undefined;
    if (checkoutChanged) revalidateTag("checkout", "max");

    const layoutChanged =
      primary_color !== undefined ||
      secondary_color !== undefined ||
      accent_color !== undefined;
    if (layoutChanged) revalidateTag("layout", "max");

    revalidatePath("/dashboard/settings");

    await logActivity({
      action: "update_site_config",
      entity_type: "site_config",
      entity_id: id,
      user,
      status: "SUCCESS",
      details: { id, name },
    });

    return { success: true, message: "Site config updated successfully." };
  } catch (error) {
    console.error(error);
    await logActivity({
      action: "update_site_config",
      entity_type: "site_config",
      entity_id: id,
      user,
      status: "FAILED",
      details: { id, error: String(error) },
    });
    return { success: false, message: "Failed to update site config." };
  }
}

// ─── SITEMAP REVALIDATION ─────────────────────────────────────────────────────

export async function revalidateSitemapAction(): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/settings");

  try {
    revalidateTag("sitemap", "max");
    revalidatePath("/sitemap.xml");

    await logActivity({
      action: "revalidate_sitemap",
      entity_type: "sitemap",
      user,
      status: "SUCCESS",
      details: {},
    });

    return {
      success: true,
      message: "Sitemap cache revalidated successfully.",
    };
  } catch (error) {
    console.error("Failed to revalidate sitemap:", error);
    await logActivity({
      action: "revalidate_sitemap",
      entity_type: "sitemap",
      user,
      status: "FAILED",
      details: { error: String(error) },
    });
    return {
      success: false,
      message: "Failed to revalidate sitemap cache.",
    };
  }
}

export const generateSitemapAction = revalidateSitemapAction;

