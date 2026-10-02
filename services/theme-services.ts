import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Validates that the active database connection is configured in the environment.
 */
function assertDatabaseConfigured() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("Active database connection string (DATABASE_URL) is not configured in environment.");
  }
}

// ─── IN-USE SAFEGUARDS ────────────────────────────────────────────────────────

/**
 * Checks whether a specific theme component is currently bound in site_config or site_page.
 */
export async function checkThemeComponentInUseInDB(
  componentId: number,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ inUse: boolean; reason?: string }> {
  // 1. Check site_config (header & footer component bindings)
  const siteConfig = await client.site_config.findFirst({
    where: { id: 1 },
    select: { header_config: true, footer_config: true, theme_config: true },
  });

  if (siteConfig) {
    const hCfg = (siteConfig.header_config ?? {}) as Record<string, any>;
    const fCfg = (siteConfig.footer_config ?? {}) as Record<string, any>;
    const tCfg = (siteConfig.theme_config ?? {}) as Record<string, any>;

    if (Number(hCfg.component_id) === componentId) {
      return { inUse: true, reason: "Assigned as active Storefront Header" };
    }
    if (Number(fCfg.component_id) === componentId) {
      return { inUse: true, reason: "Assigned as active Storefront Footer" };
    }
    if (Number(tCfg.component_id) === componentId) {
      return { inUse: true, reason: "Assigned in Site Theme Settings" };
    }
  }

  // 2. Check site_page records
  const pages = await client.site_page.findMany({
    select: { id: true, title: true, slug: true, theme_config: true },
  });

  for (const p of pages) {
    const pCfg = (p.theme_config ?? {}) as Record<string, any>;
    if (Number(pCfg.component_id) === componentId) {
      return { inUse: true, reason: `Assigned to page '${p.title}' (${p.slug})` };
    }
  }

  return { inUse: false };
}

/**
 * Checks whether any component of a given theme is currently in use.
 */
export async function checkThemeInUseInDB(
  themeId: number,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ inUse: boolean; reason?: string }> {
  const components = await client.theme_component.findMany({
    where: { theme_id: themeId },
    select: { id: true, name: true },
  });

  for (const comp of components) {
    const check = await checkThemeComponentInUseInDB(comp.id, client);
    if (check.inUse) {
      return {
        inUse: true,
        reason: `Component '${comp.name}' is currently in use: ${check.reason}`,
      };
    }
  }

  return { inUse: false };
}

// ─── THEMES ───────────────────────────────────────────────────────────────────

export async function createThemeInDB(
  data: {
    name: string;
    slug: string;
    description?: string | null;
    is_active?: boolean;
  },
  userId: number,
) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    // Check uniqueness
    const existing = await tx.theme.findFirst({
      where: {
        OR: [
          { name: { equals: data.name, mode: "insensitive" } },
          { slug: { equals: data.slug, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      if (existing.name.toLowerCase() === data.name.toLowerCase()) {
        throw new Error(`Theme with name '${data.name}' already exists.`);
      }
      throw new Error(`Theme folder identifier '${data.slug}' already exists.`);
    }

    return await tx.theme.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
        description: data.description?.trim() || null,
        is_active: data.is_active ?? true,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateThemeInDB(
  id: number,
  data: {
    name?: string;
    slug?: string;
    description?: string | null;
    is_active?: boolean;
  },
  userId: number,
) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.theme.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Theme with ID ${id} not found.`);
    }

    // Uniqueness checks on name/slug changes
    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const nameConflict = await tx.theme.findFirst({
        where: {
          id: { not: id },
          name: { equals: data.name, mode: "insensitive" },
        },
      });
      if (nameConflict) {
        throw new Error(`Theme name '${data.name}' is already in use.`);
      }
    }

    if (data.slug && data.slug.toLowerCase() !== existing.slug.toLowerCase()) {
      const slugConflict = await tx.theme.findFirst({
        where: {
          id: { not: id },
          slug: { equals: data.slug, mode: "insensitive" },
        },
      });
      if (slugConflict) {
        throw new Error(`Theme folder identifier '${data.slug}' is already in use.`);
      }
    }

    // Field diffing
    const updatePayload: Prisma.themeUpdateInput = {
      updated_by: userId,
    };

    if (data.name !== undefined && data.name.trim() !== existing.name) {
      updatePayload.name = data.name.trim();
    }
    if (data.slug !== undefined && data.slug.trim().toLowerCase() !== existing.slug) {
      updatePayload.slug = data.slug.trim().toLowerCase();
    }
    if (data.description !== undefined) {
      const trimmedDesc = data.description ? data.description.trim() : null;
      if (trimmedDesc !== existing.description) {
        updatePayload.description = trimmedDesc;
      }
    }
    if (data.is_active !== undefined && data.is_active !== existing.is_active) {
      updatePayload.is_active = data.is_active;
    }

    return await tx.theme.update({
      where: { id },
      data: updatePayload,
    });
  });
}

export async function deleteThemePermanentlyInDB(id: number) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.theme.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Theme with ID ${id} not found.`);
    }

    // In-use guard
    const inUseCheck = await checkThemeInUseInDB(id, tx);
    if (inUseCheck.inUse) {
      throw new Error(
        `Cannot delete theme '${existing.name}': ${inUseCheck.reason}. Reassign storefront settings first.`,
      );
    }

    return await tx.theme.delete({
      where: { id },
    });
  });
}

export async function bulkToggleThemesStatusInDB(
  ids: number[],
  is_active: boolean,
  userId: number,
) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    return await tx.theme.updateMany({
      where: { id: { in: ids } },
      data: {
        is_active,
        updated_by: userId,
      },
    });
  });
}

export async function bulkDeleteThemesPermanentlyInDB(ids: number[]) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    // Verify none are in use
    for (const id of ids) {
      const theme = await tx.theme.findUnique({ where: { id } });
      if (!theme) continue;
      const inUseCheck = await checkThemeInUseInDB(id, tx);
      if (inUseCheck.inUse) {
        throw new Error(
          `Cannot delete theme '${theme.name}': ${inUseCheck.reason}. Reassign storefront settings first.`,
        );
      }
    }

    return await tx.theme.deleteMany({
      where: { id: { in: ids } },
    });
  });
}

// ─── THEME COMPONENTS ─────────────────────────────────────────────────────────

export async function createThemeComponentInDB(
  data: {
    theme_id: number;
    name: string;
    component_type: string;
    file_path: string;
    theme_config?: Record<string, unknown>;
    is_active?: boolean;
  },
  userId: number,
) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    const theme = await tx.theme.findUnique({ where: { id: data.theme_id } });
    if (!theme) {
      throw new Error(`Parent theme with ID ${data.theme_id} not found.`);
    }

    const cleanPath = data.file_path.trim().replace(/^\/+/, "");

    // Check collision on [theme_id, component_type, file_path]
    const existing = await tx.theme_component.findFirst({
      where: {
        theme_id: data.theme_id,
        component_type: data.component_type,
        file_path: cleanPath,
      },
    });

    if (existing) {
      throw new Error(
        `Component with type '${data.component_type}' and path '${cleanPath}' is already registered for this theme.`,
      );
    }

    return await tx.theme_component.create({
      data: {
        theme_id: data.theme_id,
        name: data.name.trim(),
        component_type: data.component_type,
        file_path: cleanPath,
        theme_config: (data.theme_config ?? {}) as any,
        is_active: data.is_active ?? true,
        created_by: userId,
        updated_by: userId,
      },
      include: {
        theme: true,
      },
    });
  });
}

export async function updateThemeComponentInDB(
  id: number,
  data: {
    theme_id?: number;
    name?: string;
    component_type?: string;
    file_path?: string;
    theme_config?: Record<string, unknown>;
    is_active?: boolean;
  },
  userId: number,
) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.theme_component.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Theme component with ID ${id} not found.`);
    }

    const targetThemeId = data.theme_id ?? existing.theme_id;
    const targetType = data.component_type ?? existing.component_type;
    const targetPath = data.file_path !== undefined ? data.file_path.trim().replace(/^\/+/, "") : existing.file_path;

    if (
      targetThemeId !== existing.theme_id ||
      targetType !== existing.component_type ||
      targetPath !== existing.file_path
    ) {
      const conflict = await tx.theme_component.findFirst({
        where: {
          id: { not: id },
          theme_id: targetThemeId,
          component_type: targetType,
          file_path: targetPath,
        },
      });
      if (conflict) {
        throw new Error(
          `Another component with type '${targetType}' and path '${targetPath}' is already registered for this theme.`,
        );
      }
    }

    // Field diffing
    const updatePayload: Prisma.theme_componentUpdateInput = {
      updated_by: userId,
    };

    if (data.theme_id !== undefined && data.theme_id !== existing.theme_id) {
      updatePayload.theme = { connect: { id: data.theme_id } };
    }
    if (data.name !== undefined && data.name.trim() !== existing.name) {
      updatePayload.name = data.name.trim();
    }
    if (data.component_type !== undefined && data.component_type !== existing.component_type) {
      updatePayload.component_type = data.component_type;
    }
    if (data.file_path !== undefined && targetPath !== existing.file_path) {
      updatePayload.file_path = targetPath;
    }
    if (data.theme_config !== undefined) {
      updatePayload.theme_config = data.theme_config as any;
    }
    if (data.is_active !== undefined && data.is_active !== existing.is_active) {
      updatePayload.is_active = data.is_active;
    }

    return await tx.theme_component.update({
      where: { id },
      data: updatePayload,
      include: {
        theme: true,
      },
    });
  });
}

export async function deleteThemeComponentPermanentlyInDB(id: number) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.theme_component.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Theme component with ID ${id} not found.`);
    }

    // In-use guard
    const inUseCheck = await checkThemeComponentInUseInDB(id, tx);
    if (inUseCheck.inUse) {
      throw new Error(
        `Cannot delete component '${existing.name}': ${inUseCheck.reason}. Reassign storefront settings first.`,
      );
    }

    return await tx.theme_component.delete({
      where: { id },
    });
  });
}

export async function bulkToggleThemeComponentsStatusInDB(
  ids: number[],
  is_active: boolean,
  userId: number,
) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    return await tx.theme_component.updateMany({
      where: { id: { in: ids } },
      data: {
        is_active,
        updated_by: userId,
      },
    });
  });
}

export async function bulkDeleteThemeComponentsPermanentlyInDB(ids: number[]) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    for (const id of ids) {
      const comp = await tx.theme_component.findUnique({ where: { id } });
      if (!comp) continue;
      const inUseCheck = await checkThemeComponentInUseInDB(id, tx);
      if (inUseCheck.inUse) {
        throw new Error(
          `Cannot delete component '${comp.name}': ${inUseCheck.reason}. Reassign storefront settings first.`,
        );
      }
    }

    return await tx.theme_component.deleteMany({
      where: { id: { in: ids } },
    });
  });
}

// ─── DASHBOARD QUERIES ────────────────────────────────────────────────────────

export async function getThemesDashboardDataInDB(
  where: Prisma.themeWhereInput,
  skipCount: number = 0,
  pageSize: number = 10,
) {
  assertDatabaseConfigured();

  return await prisma.$transaction(async (tx) => {
    const themes = await tx.theme.findMany({
      where,
      include: {
        components: {
          orderBy: { id: "asc" },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { id: "asc" },
    });

    const totalThemes = await tx.theme.count({ where });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { themes, totalThemes, dashboardUsers };
  });
}

/**
 * Returns all active themes with active components, grouped for dropdown selection.
 */
export async function getActiveThemesWithComponentsInDB() {
  assertDatabaseConfigured();

  return await prisma.theme.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      is_active: true,
      components: {
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          component_type: true,
          file_path: true,
          theme_config: true,
          is_active: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}
