import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

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
  return await prisma.theme.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      is_active: data.is_active ?? true,
      created_by: userId,
      updated_by: userId,
    },
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
  return await prisma.theme.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
      updated_by: userId,
    },
  });
}

export async function deleteThemePermanentlyInDB(id: number) {
  return await prisma.theme.delete({
    where: { id },
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
  return await prisma.theme_component.create({
    data: {
      theme_id: data.theme_id,
      name: data.name,
      component_type: data.component_type,
      file_path: data.file_path,
      theme_config: (data.theme_config ?? {}) as any,
      is_active: data.is_active ?? true,
      created_by: userId,
      updated_by: userId,
    },
    include: {
      theme: true,
    },
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
  return await prisma.theme_component.update({
    where: { id },
    data: {
      ...(data.theme_id !== undefined && { theme_id: data.theme_id }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.component_type !== undefined && { component_type: data.component_type }),
      ...(data.file_path !== undefined && { file_path: data.file_path }),
      ...(data.theme_config !== undefined && { theme_config: data.theme_config as any }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
      updated_by: userId,
    },
    include: {
      theme: true,
    },
  });
}

export async function deleteThemeComponentPermanentlyInDB(id: number) {
  return await prisma.theme_component.delete({
    where: { id },
  });
}

// ─── DASHBOARD QUERIES ────────────────────────────────────────────────────────

export async function getThemesDashboardDataInDB(
  where: Prisma.themeWhereInput,
  skipCount: number = 0,
  pageSize: number = 10,
) {
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
