import { ZodError } from "zod";
import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

export type ActionResponse<T = any> = {
  success: boolean;
  errors?: Record<string, string>;
  message?: string;
  data?: T;
};

export function formatZodErrors(errors: ZodError<any>): Record<string, string> {
  return Object.fromEntries(
    errors.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

export async function getUserNameById(id: number): Promise<string> {
  // "use cache";
  // cacheTag(`user-name-${id}`);
  // cacheLife("max");

  if (id === 0) return "System";

  try {
    const dbUser = await prisma.dashboard_user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    return dbUser ? dbUser.name || dbUser.email : "System";
  } catch (error) {
    console.error(`Error resolving user name for ID ${id}:`, error);
    return "System";
  }
}

export async function resolveUserNames(
  userIds: number[],
): Promise<Record<number, string>> {
  const uniqueIds = Array.from(
    new Set(userIds.filter((id) => id !== undefined && id !== null)),
  );

  if (uniqueIds.length === 0) {
    return { 0: "System" };
  }

  const nameMap: Record<number, string> = { 0: "System" };

  await Promise.all(
    uniqueIds.map(async (id) => {
      nameMap[id] = await getUserNameById(id);
    }),
  );

  return nameMap;
}

export function serializeProduct<T extends Record<string, any>>(p: T): T {
  if (!p) return p;
  return {
    ...p,
    price: p.price != null ? String(p.price) : "0",
    compare_at_price:
      p.compare_at_price != null ? String(p.compare_at_price) : null,
    cost_price: p.cost_price != null ? String(p.cost_price) : null,
    weight: p.weight != null ? String(p.weight) : null,
  };
}

export function serializeProducts<T extends Record<string, any>>(
  products: T[],
): T[] {
  return products.map((p) => serializeProduct(p));
}

export function serializeShippingMethod<T extends Record<string, any>>(
  s: T,
): T {
  if (!s) return s;
  return {
    ...s,
    price: s.price != null ? String(s.price) : "0",
    free_over: s.free_over != null ? String(s.free_over) : null,
  };
}

export function serializeShippingMethods<T extends Record<string, any>>(
  methods: T[],
): T[] {
  return methods.map((m) => serializeShippingMethod(m));
}

export function serializePaymentMethod<T extends Record<string, any>>(m: T): T {
  if (!m) return m;
  return {
    ...m,
    extra_charge: m.extra_charge != null ? String(m.extra_charge) : null,
  };
}

export function serializePaymentMethods<T extends Record<string, any>>(
  methods: T[],
): T[] {
  return methods.map((m) => serializePaymentMethod(m));
}

export function serializeCoupon<T extends Record<string, any>>(c: T): T {
  if (!c) return c;
  return {
    ...c,
    discount_value: c.discount_value != null ? String(c.discount_value) : "0",
    minimum_order_amount:
      c.minimum_order_amount != null ? String(c.minimum_order_amount) : null,
  };
}

export function serializeCoupons<T extends Record<string, any>>(
  coupons: T[],
): T[] {
  return coupons.map((c) => serializeCoupon(c));
}

export function serializeOrder<T extends Record<string, any>>(o: T): any {
  if (!o) return o;
  return {
    ...o,
    total: o.total != null ? String(o.total) : "0",
    subtotal: o.subtotal != null ? String(o.subtotal) : "0",
    shipping_cost: o.shipping_cost != null ? String(o.shipping_cost) : "0",
    discount_amount:
      o.discount_amount != null ? String(o.discount_amount) : "0",
    tax_amount: o.tax_amount != null ? String(o.tax_amount) : "0",
    items: Array.isArray(o.items)
      ? o.items.map((item: any) => ({
          ...item,
          unit_price: item.unit_price != null ? String(item.unit_price) : "0",
          line_total: item.line_total != null ? String(item.line_total) : "0",
        }))
      : o.items,
  };
}

export function serializeOrders<T extends Record<string, any>>(
  orders: T[],
): any[] {
  return orders.map((o) => serializeOrder(o));
}

export function serializePage<T extends Record<string, any>>(p: T): T {
  if (!p) return p;
  return {
    ...p,
    meta_info: (p.meta_info ?? {}) as Record<string, any>,
  };
}

export function serializePages<T extends Record<string, any>>(pages: T[]): T[] {
  return pages.map((p) => serializePage(p));
}
