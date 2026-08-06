import { cacheLife, cacheTag } from "next/cache";
import prisma from "./prisma";
import { CRUD } from "./types";

const ALL_STANDARD_FEATURES = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/dashboard/settings", name: "Settings" },
  { path: "/dashboard/pages", name: "Pages" },
  { path: "/dashboard/site-components", name: "Site Components" },
  { path: "/dashboard/email-config", name: "Email Config" },
  { path: "/dashboard/shipping", name: "Shipping" },
  { path: "/dashboard/payment-methods", name: "Payment Methods" },
  { path: "/dashboard/media", name: "Media" },
  { path: "/dashboard/users", name: "Users" },
  { path: "/dashboard/roles", name: "Roles" },
  { path: "/dashboard/categories", name: "Categories" },
  { path: "/dashboard/products", name: "Products" },
  { path: "/dashboard/coupons", name: "Coupons" },
  { path: "/dashboard/invoices", name: "Invoices" },
  { path: "/dashboard/orders", name: "Orders" },
  { path: "/dashboard/newsletter", name: "Newsletter" },
  { path: "/dashboard/sent-emails", name: "Sent Emails" },
  { path: "/dashboard/activity-logs", name: "Activity Logs" },
];

export async function getRolePermissions(role: string) {
  "use cache";
  cacheTag(`admin-permissions-${role}`);
  cacheLife("max");
  try {
    if (role === "superadmin") {
      const dbFeatures = await prisma.site_feature.findMany({
        where: {
          enabled: true,
        },
        select: { path: true, name: true },
      });

      const featureMap = new Map<string, string>();
      ALL_STANDARD_FEATURES.forEach((f) => featureMap.set(f.path, f.name));
      dbFeatures.forEach((f) => featureMap.set(f.path, f.name));

      const accessPaths = Array.from(featureMap.entries()).map(
        ([path, name]) => ({
          path,
          name,
          crud: { create: true, read: true, update: true, delete: true },
        }),
      );

      return { accessPaths };
    }

    const adminPermissions = await prisma.site_feature_role.findMany({
      where: {
        role: { name: role, is_active: true, deleted_at: null },
        site_feature: {
          enabled: true,
          path: { notIn: ["/dashboard/secrets-vault", "/dashboard/secrets"] },
        },
      },
      select: {
        site_feature: { select: { path: true, name: true } },
        access_crud: true,
      },
    });

    const accessPaths = adminPermissions.map((r) => ({
      path: r.site_feature.path,
      crud: r.access_crud as CRUD,
      name: r.site_feature.name,
    }));

    if (!accessPaths.some((p) => p.path === "/dashboard")) {
      accessPaths.unshift({
        path: "/dashboard",
        name: "Dashboard",
        crud: { create: true, read: true, update: true, delete: true },
      });
    }

    return { accessPaths };
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return { accessPaths: [] };
  }
}
