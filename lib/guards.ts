import { redirect } from "next/navigation";
import { auth } from "./auth";
import { CRUD } from "./types";
import { getRolePermissions } from "./permissions";

export async function assertPermission(action: keyof CRUD, path: string) {
  const session = await auth();
  if (!session?.user?.role) {
    redirect("/login");
  }

  const { accessPaths } = await getRolePermissions(session.user.role);
  const match = accessPaths.find((r) => r.path === path && r.crud[action]);

  if (!match) {
    redirect("/dashboard");
  }

  return { permissions: match.crud, user: session.user };
}
