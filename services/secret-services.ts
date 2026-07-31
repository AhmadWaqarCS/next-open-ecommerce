import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Returns a map of key_names that are currently connected to active DB modules
 * (e.g. Email Config, Payment Methods) and the reason/description of the connection.
 */
export async function getConnectedSecretsMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  try {
    // Check Email Config
    const emailConfig = await prisma.email_config.findFirst({
      where: { deleted_at: null },
    });
    if (emailConfig && emailConfig.provider === "smtp") {
      map["smtp_password"] = "Email Configuration (SMTP)";
    }

    // Check Payment Methods
    const paymentMethods = await prisma.payment_method.findMany({
      where: { deleted_at: null },
      select: { provider: true, name: true },
    });

    paymentMethods.forEach((pm) => {
      if (pm.provider === "stripe") {
        map["stripe_secret_key"] = `Payment Method (${pm.name})`;
        map["stripe_webhook_secret"] = `Payment Method (${pm.name})`;
      } else if (pm.provider === "paypal") {
        map["paypal_secret_key"] = `Payment Method (${pm.name})`;
        map["paypal_client_secret"] = `Payment Method (${pm.name})`;
      } else if (pm.provider === "square") {
        map["square_secret_key"] = `Payment Method (${pm.name})`;
      } else if (pm.provider === "razorpay") {
        map["razorpay_secret_key"] = `Payment Method (${pm.name})`;
      }
    });
  } catch (error) {
    console.error("Error building connected secrets map:", error);
  }

  return map;
}

// ─── READS ────────────────────────────────────────────────────────────────────

/** Admin: list all secret keys (without the encrypted values for safety). */
export async function getSecretsFromDB() {
  return await prisma.secret_vault.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      key_name: true,
      description: true,
      last_rotated: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { key_name: "asc" },
  });
}

/** Admin: read a specific secret's full record by ID. */
export async function getSecretByIdFromDB(id: number) {
  return await prisma.secret_vault.findUnique({
    where: { id },
  });
}

/** Admin: read a specific secret's full record (ciphertext + iv + auth_tag). */
export async function getSecretByKeyFromDB(keyName: string) {
  return await prisma.secret_vault.findUnique({
    where: { key_name: keyName },
  });
}

/** Helper: retrieve secret target IDs and key_names for bulk deletion filtering. */
export async function getSecretTargetsFromDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.secret_vaultWhereInput,
  isTrash: boolean = false
) {
  if (selectAllScope) {
    return await prisma.secret_vault.findMany({
      where: filterWhere,
      select: { id: true, key_name: true },
    });
  } else {
    return await prisma.secret_vault.findMany({
      where: isTrash ? { id: { in: ids } } : { id: { in: ids }, deleted_at: null },
      select: { id: true, key_name: true },
    });
  }
}

/** Admin: soft-deleted secrets. */
export async function getDeletedSecretsFromDB() {
  return await prisma.secret_vault.findMany({
    where: { deleted_at: { not: null } },
    select: { id: true, key_name: true, deleted_at: true, deleted_by: true },
    orderBy: { deleted_at: "desc" },
  });
}

export async function createSecretInDB(data: {
  key_name: string;
  encrypted_value: string;
  iv: string;
  auth_tag: string;
  description?: string | null;
  last_rotated?: Date | null;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.secret_vault.create({ data });
}

export async function updateSecretInDB(
  id: number,
  data: {
    key_name?: string;
    encrypted_value?: string;
    iv?: string;
    auth_tag?: string;
    description?: string | null;
    last_rotated?: Date | null;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.secret_vault.update({ where: { id }, data });
}

export async function deleteSecretPermanentlyInDB(id: number) {
  return await prisma.secret_vault.delete({ where: { id } });
}

export async function upsertSecretByKeyInDB(data: {
  key_name: string;
  encrypted_value: string;
  iv: string;
  auth_tag: string;
  description?: string | null;
  userId: number;
}) {
  const existing = await prisma.secret_vault.findUnique({
    where: { key_name: data.key_name },
  });

  if (existing) {
    return await prisma.secret_vault.update({
      where: { id: existing.id },
      data: {
        encrypted_value: data.encrypted_value,
        iv: data.iv,
        auth_tag: data.auth_tag,
        description: data.description ?? existing.description,
        last_rotated: new Date(),
        updated_by: data.userId,
        deleted_at: null,
        deleted_by: null,
      },
    });
  } else {
    return await prisma.secret_vault.create({
      data: {
        key_name: data.key_name,
        encrypted_value: data.encrypted_value,
        iv: data.iv,
        auth_tag: data.auth_tag,
        description: data.description || null,
        last_rotated: new Date(),
        created_by: data.userId,
        updated_by: data.userId,
      },
    });
  }
}

export async function bulkUpdateSecretsInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.secret_vaultWhereInput
) {
  let whereCondition: any;

  if (selectAllScope) {
    if (filterWhere) {
      whereCondition = filterWhere;
    } else if (isTrash) {
      whereCondition = { NOT: { deleted_at: null } };
    } else {
      whereCondition = { deleted_at: null };
    }
  } else {
    whereCondition = { id: { in: ids } };
  }

  return await prisma.secret_vault.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeleteSecretsPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.secret_vaultWhereInput
) {
  let whereCondition: any;

  if (selectAllScope) {
    if (filterWhere) {
      whereCondition = filterWhere;
    } else {
      whereCondition = { NOT: { deleted_at: null } };
    }
  } else {
    whereCondition = { id: { in: ids } };
  }

  return await prisma.secret_vault.deleteMany({
    where: whereCondition,
  });
}
