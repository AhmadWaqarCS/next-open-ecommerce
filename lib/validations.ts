import { z } from "zod";

// ============================================================
// PRIMITIVES & SHARED SCHEMAS
// ============================================================

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long");

const emailSchema = z.email("Please enter a valid email address");

export const EmailSchema = z.object({ email: emailSchema });

const emailObject = z.object({
  email: emailSchema,
});

export type EmailInput = z.infer<typeof emailObject>;

const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase with hyphens only",
  );

const urlSchema = z.url("Please enter a valid URL");

const colorHexSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Please enter a valid hex color (e.g. #0f0f0f)");

const metaInfoSchema = z
  .object({
    title: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    keywords: z.string().optional().or(z.literal("")),
    og_title: z.string().optional().or(z.literal("")),
    og_description: z.string().optional().or(z.literal("")),
    og_image: z.string().optional().or(z.literal("")),
    twitter_card: z.string().optional().or(z.literal("")),
    twitter_title: z.string().optional().or(z.literal("")),
    twitter_description: z.string().optional().or(z.literal("")),
    twitter_image: z.string().optional().or(z.literal("")),
  })
  .default({});

const socialLinksSchema = z
  .object({
    twitter: urlSchema.optional().or(z.literal("")),
    instagram: urlSchema.optional().or(z.literal("")),
    facebook: urlSchema.optional().or(z.literal("")),
    youtube: urlSchema.optional().or(z.literal("")),
    tiktok: urlSchema.optional().or(z.literal("")),
  })
  .default({});

export const idSchema = z.object({ id: z.number().int().positive() });

// ============================================================
// USERS (dashboard_user)
// ============================================================

export const userLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type UserLoginInput = z.infer<typeof userLoginSchema>;

export const userCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role_name: z.string().min(1, "Please select a role"),
  is_active: z.boolean(),
  name: z.string().max(255).optional(),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  password: z.union([z.literal(""), passwordSchema]).optional(),
  role_name: z.string().min(1, "Please select a role").optional(),
  is_active: z.boolean().optional(),
  name: z.string().max(255).optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// ============================================================
// ROLES
// ============================================================

export const roleCreateSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  is_active: z.boolean().default(true),
});
export type RoleCreateInput = z.infer<typeof roleCreateSchema>;

export const roleUpdateSchema = z.object({
  name: z.string().min(1, "Role name is required").optional(),
  is_active: z.boolean().optional(),
});
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

// ============================================================
// SITE FEATURES
// ============================================================

export const siteFeatureCreateSchema = z.object({
  name: z.string().min(1, "Feature name is required"),
  path: z.string().min(1, "Path is required"),
  enabled: z.boolean(),
  is_super: z.boolean().default(false),
});
export type SiteFeatureCreateInput = z.infer<typeof siteFeatureCreateSchema>;

export const siteFeatureUpdateSchema = z.object({
  name: z.string().min(1, "Feature name is required").optional(),
  path: z.string().min(1, "Path is required").optional(),
  enabled: z.boolean().optional(),
  is_super: z.boolean().optional(),
});
export type SiteFeatureUpdateInput = z.infer<typeof siteFeatureUpdateSchema>;

// ============================================================
// SITE FEATURE ROLES (junction — composite PK)
// ============================================================

const accessCrudSchema = z.object({
  create: z.boolean().default(false),
  read: z.boolean().default(false),
  update: z.boolean().default(false),
  delete: z.boolean().default(false),
});
export type AccessCrud = z.infer<typeof accessCrudSchema>;

export const siteFeatureRoleCreateSchema = z.object({
  site_feature_id: z.number().int().positive("Site feature is required"),
  role_id: z.number().int().positive("Role is required"),
  access_crud: accessCrudSchema,
});
export type SiteFeatureRoleCreateInput = z.infer<
  typeof siteFeatureRoleCreateSchema
>;

export const siteFeatureRoleUpdateSchema = z.object({
  access_crud: accessCrudSchema,
});
export type SiteFeatureRoleUpdateInput = z.infer<
  typeof siteFeatureRoleUpdateSchema
>;

// ============================================================
// SITE CONFIG
// ============================================================

export const siteConfigCreateSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  tagline: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  site_url: urlSchema.optional().or(z.literal("")),

  // Header & Home hero
  topbar_message: z.string().optional().or(z.literal("")),
  home_tagline_label: z.string().optional().or(z.literal("")),

  // Branding
  light_logo_url: z.string().optional().or(z.literal("")),
  dark_logo_url: z.string().optional().or(z.literal("")),
  favicon_url: z.string().optional().or(z.literal("")),
  primary_color: colorHexSchema.default("#18181b"),
  secondary_color: colorHexSchema.default("#27272a"),
  accent_color: colorHexSchema.default("#f59e0b"),

  // Localisation
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO code")
    .default("USD"),
  currency_symbol: z
    .string()
    .min(1, "Currency symbol is required")
    .default("$"),

  // Contact
  email: emailSchema.optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),

  social_links: socialLinksSchema,

  // Business identity
  business_name: z.string().optional().or(z.literal("")),
  business_registration_number: z.string().optional().or(z.literal("")),
  tax_rate: z.preprocess(
    (val) =>
      val === "" || val === undefined || val === null ? undefined : Number(val),
    z.number().min(0).max(1, "Tax rate must be between 0 and 1").optional(),
  ),
  tax_inclusive: z.boolean().default(false),
  tax_label: z.string().default("Tax"),

  // Checkout
  require_phone: z.boolean().default(false),
  allow_order_notes: z.boolean().default(true),

  meta_info: metaInfoSchema,
});
export type SiteConfigCreateInput = z.infer<typeof siteConfigCreateSchema>;

export const siteConfigUpdateSchema = siteConfigCreateSchema.partial();
export type SiteConfigUpdateInput = z.infer<typeof siteConfigUpdateSchema>;

// ============================================================
// SITE PAGES
// ============================================================

export const sitePageCreateSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, "Page title is required"),
  content: z.string().min(1, "Page content is required"),
  is_active: z.boolean().default(true),
  meta_info: metaInfoSchema,
});
export type SitePageCreateInput = z.infer<typeof sitePageCreateSchema>;

export const sitePageUpdateSchema = sitePageCreateSchema.partial();
export type SitePageUpdateInput = z.infer<typeof sitePageUpdateSchema>;

// ============================================================
// EMAIL CONFIG
// ============================================================

export const emailConfigCreateSchema = z.object({
  provider: z.enum(["smtp", "resend", "sendgrid", "ses"]).default("smtp"),

  from_name: z.string().min(1, "Sender name is required"),
  from_email: emailSchema,
  reply_to_email: emailSchema.optional().or(z.literal("")),

  smtp_host: z.string().optional(),
  smtp_port: z.preprocess(
    (val) =>
      val === "" || val === undefined || val === null ? undefined : Number(val),
    z.number().int().min(1).max(65535).optional(),
  ),
  smtp_secure: z.boolean().default(true),
  smtp_password: z.string().optional(),

  send_order_confirmation: z.boolean().default(true),
  send_shipping_update: z.boolean().default(true),
  send_admin_new_order: z.boolean().default(true),
  admin_notification_email: emailSchema.optional().or(z.literal("")),

  include_pdf_invoice: z.boolean().default(false),
  is_active: z.boolean().default(true),
});
export type EmailConfigCreateInput = z.infer<typeof emailConfigCreateSchema>;

export const emailConfigUpdateSchema = emailConfigCreateSchema.partial();
export type EmailConfigUpdateInput = z.infer<typeof emailConfigUpdateSchema>;

// ============================================================
// SECRET VAULT
// ============================================================

export const secretVaultCreateSchema = z.object({
  key_name: z
    .string()
    .min(1, "Key name is required")
    .regex(/^[a-z0-9_]+$/, "Key name must be lowercase with underscores only"),
  encrypted_value: z.string().min(1, "Encrypted value is required"),
  iv: z.string().min(1, "IV is required"),
  auth_tag: z.string().min(1, "Auth tag is required"),
  description: z.string().optional(),
  last_rotated: z.string().datetime().optional(),
});
export type SecretVaultCreateInput = z.infer<typeof secretVaultCreateSchema>;

export const secretVaultUpdateSchema = z.object({
  encrypted_value: z.string().min(1, "Encrypted value is required").optional(),
  iv: z.string().min(1, "IV is required").optional(),
  auth_tag: z.string().min(1, "Auth tag is required").optional(),
  description: z.string().optional(),
  last_rotated: z.string().datetime().optional(),
});
export type SecretVaultUpdateInput = z.infer<typeof secretVaultUpdateSchema>;

export const secretVaultFormCreateSchema = z.object({
  key_name: z
    .string()
    .min(1, "Key name is required")
    .regex(
      /^[a-z0-9_]+$/,
      "Key name must be lowercase with underscores only (e.g. smtp_password)",
    ),
  description: z.string().optional().nullable(),
});
export type SecretVaultFormCreateInput = z.infer<
  typeof secretVaultFormCreateSchema
>;

export const secretVaultFormUpdateSchema = z.object({
  description: z.string().optional().nullable(),
});
export type SecretVaultFormUpdateInput = z.infer<
  typeof secretVaultFormUpdateSchema
>;

// ============================================================
// SHIPPING METHODS
// ============================================================

export const shippingMethodCreateSchema = z
  .object({
    name: z.string().min(1, "Shipping method name is required"),
    description: z.string().optional().nullable(),
    price: z.coerce.number().min(0, "Price must be 0 or greater"),
    free_over: z.coerce.number().min(0).optional().nullable(),
    estimated_days_min: z.coerce.number().int().min(0).optional().nullable(),
    estimated_days_max: z.coerce.number().int().min(0).optional().nullable(),
    is_active: z.boolean().default(true),
    sort_order: z.coerce.number().int().default(0),
  })
  .refine(
    (data) => {
      if (
        data.estimated_days_min !== undefined &&
        data.estimated_days_min !== null &&
        data.estimated_days_max !== undefined &&
        data.estimated_days_max !== null
      ) {
        return data.estimated_days_max >= data.estimated_days_min;
      }
      return true;
    },
    {
      message: "Max days must be greater than or equal to min days",
      path: ["estimated_days_max"],
    },
  );
export type ShippingMethodCreateInput = z.infer<
  typeof shippingMethodCreateSchema
>;

export const shippingMethodUpdateSchema = z
  .object({
    name: z.string().min(1, "Shipping method name is required").optional(),
    description: z.string().optional().nullable(),
    price: z.coerce.number().min(0, "Price must be 0 or greater").optional(),
    free_over: z.coerce.number().min(0).optional().nullable(),
    estimated_days_min: z.coerce.number().int().min(0).optional().nullable(),
    estimated_days_max: z.coerce.number().int().min(0).optional().nullable(),
    is_active: z.boolean().optional(),
    sort_order: z.coerce.number().int().optional(),
  })
  .refine(
    (data) => {
      if (
        data.estimated_days_min !== undefined &&
        data.estimated_days_min !== null &&
        data.estimated_days_max !== undefined &&
        data.estimated_days_max !== null
      ) {
        return data.estimated_days_max >= data.estimated_days_min;
      }
      return true;
    },
    {
      message: "Max days must be greater than or equal to min days",
      path: ["estimated_days_max"],
    },
  );
export type ShippingMethodUpdateInput = z.infer<
  typeof shippingMethodUpdateSchema
>;

// ============================================================
// COUPONS
// ============================================================

export const couponCreateSchema = z
  .object({
    code: z
      .string()
      .min(1, "Coupon code is required")
      .transform((val) => val.toUpperCase().trim()),
    discount_type: z.enum(["percentage", "fixed_amount"]),
    discount_value: z.coerce
      .number()
      .positive("Discount value must be positive"),
    minimum_order_amount: z
      .preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : val),
        z.coerce
          .number()
          .min(0, "Minimum order amount cannot be negative")
          .nullable(),
      )
      .optional(),
    max_uses: z
      .preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : val),
        z.coerce
          .number()
          .int()
          .positive("Max uses must be positive")
          .nullable(),
      )
      .optional(),
    max_uses_per_email: z.coerce
      .number()
      .int("Max uses per email must be an integer")
      .min(1, "Max uses per email must be at least 1")
      .default(1),
    starts_at: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      z.string().or(z.date()).optional(),
    ),
    expires_at: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : val),
      z.string().or(z.date()).nullable().optional(),
    ),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.discount_type === "percentage") {
        return data.discount_value <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      if (data.starts_at && data.expires_at) {
        const start = new Date(data.starts_at).getTime();
        const end = new Date(data.expires_at).getTime();
        if (!isNaN(start) && !isNaN(end)) {
          return end >= start;
        }
      }
      return true;
    },
    {
      message: "Expiration date must be on or after start date",
      path: ["expires_at"],
    },
  );
export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

export const couponUpdateSchema = z
  .object({
    code: z
      .string()
      .min(1, "Coupon code is required")
      .transform((val) => val.toUpperCase().trim())
      .optional(),
    discount_type: z.enum(["percentage", "fixed_amount"]).optional(),
    discount_value: z.coerce
      .number()
      .positive("Discount value must be positive")
      .optional(),
    minimum_order_amount: z
      .preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : val),
        z.coerce
          .number()
          .min(0, "Minimum order amount cannot be negative")
          .nullable(),
      )
      .optional(),
    max_uses: z
      .preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : val),
        z.coerce
          .number()
          .int()
          .positive("Max uses must be positive")
          .nullable(),
      )
      .optional(),
    max_uses_per_email: z.coerce
      .number()
      .int("Max uses per email must be an integer")
      .min(1, "Max uses per email must be at least 1")
      .optional(),
    starts_at: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      z.string().or(z.date()).optional(),
    ),
    expires_at: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : val),
      z.string().or(z.date()).nullable().optional(),
    ),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (
        data.discount_type === "percentage" &&
        data.discount_value !== undefined
      ) {
        return data.discount_value <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      if (data.starts_at && data.expires_at) {
        const start = new Date(data.starts_at).getTime();
        const end = new Date(data.expires_at).getTime();
        if (!isNaN(start) && !isNaN(end)) {
          return end >= start;
        }
      }
      return true;
    },
    {
      message: "Expiration date must be on or after start date",
      path: ["expires_at"],
    },
  );
export type CouponUpdateInput = z.infer<typeof couponUpdateSchema>;

// ============================================================
// ORDERS
// ============================================================

export const orderCreateSchema = z.object({
  // Customer
  customer_email: emailSchema,
  customer_first_name: z.string().min(1, "First name is required"),
  customer_last_name: z.string().min(1, "Last name is required"),
  customer_phone: z.string().optional(),
  customer_ip: z.string().optional(),
  customer_user_agent: z.string().optional(),

  // Billing address
  billing_address_line1: z.string().min(1, "Billing address is required"),
  billing_address_line2: z.string().optional(),
  billing_city: z.string().min(1, "Billing city is required"),
  billing_state: z.string().optional(),
  billing_postal_code: z.string().min(1, "Billing postal code is required"),
  billing_country: z
    .string()
    .length(2, "Country must be a 2-letter ISO code")
    .toUpperCase(),

  // Shipping address
  shipping_address_line1: z.string().min(1, "Shipping address is required"),
  shipping_address_line2: z.string().optional(),
  shipping_city: z.string().min(1, "Shipping city is required"),
  shipping_state: z.string().optional(),
  shipping_postal_code: z.string().min(1, "Shipping postal code is required"),
  shipping_country: z
    .string()
    .length(2, "Country must be a 2-letter ISO code")
    .toUpperCase(),

  // Shipping method
  shipping_method_id: z.number().int().positive().optional(),
  shipping_method_name: z.string().min(1, "Shipping method name is required"),
  shipping_cost: z.number().min(0),

  // Coupon
  coupon_id: z.number().int().positive().optional(),
  coupon_code: z.string().optional(),
  discount_amount: z.number().min(0).default(0),

  // Totals
  subtotal: z.number().min(0),
  tax_amount: z.number().min(0).default(0),
  total: z.number().min(0),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO code")
    .default("USD"),

  // Payment
  payment_method: z.enum(["stripe", "paypal", "cash_on_delivery"]),
  payment_status: z
    .enum([
      "pending",
      "cod_pending",
      "paid",
      "failed",
      "refunded",
      "partially_refunded",
    ])
    .default("pending"),

  // Fulfillment
  fulfillment_status: z
    .enum([
      "unfulfilled",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ])
    .default("unfulfilled"),

  // Notes
  admin_notes: z.string().optional(),
  customer_notes: z.string().optional(),
});
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

export const orderUpdateSchema = z.object({
  payment_status: z
    .enum([
      "pending",
      "cod_pending",
      "paid",
      "failed",
      "refunded",
      "partially_refunded",
    ])
    .optional(),
  fulfillment_status: z
    .enum([
      "unfulfilled",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ])
    .optional(),
  tracking_number: z.string().optional(),
  tracking_url: urlSchema.optional().or(z.literal("")),
  carrier_name: z.string().optional(),
  shipped_at: z.string().datetime().optional(),
  delivered_at: z.string().datetime().optional(),
  admin_notes: z.string().optional(),
  cancelled_at: z.string().datetime().optional(),
  paid_at: z.string().datetime().optional(),
});
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;

// ============================================================
// ORDER REFUNDS
// ============================================================

export const orderRefundCreateSchema = z.object({
  order_id: z.number().int().positive("Order is required"),
  amount: z.number().positive("Refund amount must be positive"),
  reason: z.string().optional(),
  provider_refund_id: z.string().optional(),
  status: z.enum(["pending", "succeeded", "failed"]).default("pending"),
  refunded_at: z.string().datetime().optional(),
});
export type OrderRefundCreateInput = z.infer<typeof orderRefundCreateSchema>;

export const orderRefundUpdateSchema = z.object({
  status: z.enum(["pending", "succeeded", "failed"]).optional(),
  provider_refund_id: z.string().optional(),
  refunded_at: z.string().datetime().optional(),
});
export type OrderRefundUpdateInput = z.infer<typeof orderRefundUpdateSchema>;

// ============================================================
// CATEGORIES
// ============================================================

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: slugSchema,
  description: z.string().optional().or(z.literal("")),
  image_url: z.string().optional().or(z.literal("")),
  image_alt_text: z.string().optional().or(z.literal("")),
  bg_color: z.string().optional().or(z.literal("")),
  parent_id: z.number().int().positive().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  meta_info: metaInfoSchema,
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = categoryCreateSchema.partial();
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

// ============================================================
// PRODUCTS
// ============================================================

export const productCreateSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: slugSchema,
  description: z.string().optional().or(z.literal("")),
  short_description: z.string().optional().or(z.literal("")),
  feature_image_url: z.string().optional().or(z.literal("")),
  feature_image_alt_text: z.string().optional().or(z.literal("")),

  price: z.number().positive("Price must be positive"),
  compare_at_price: z
    .number()
    .positive("Compare-at price must be positive")
    .optional(),
  cost_price: z.number().positive("Cost price must be positive").optional(),

  sku: z.string().optional().or(z.literal("")),
  stock_quantity: z.number().int().min(0).default(0),
  low_stock_threshold: z.number().int().min(0).default(5),
  track_inventory: z.boolean().default(true),

  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
    })
    .optional(),

  category_id: z.number().int().positive().optional(),

  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),

  meta_info: metaInfoSchema,
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

// ============================================================
// PRODUCT IMAGES
// ============================================================

export const productImageCreateSchema = z.object({
  product_id: z.number().int().positive("Product is required"),
  url: urlSchema,
  alt_text: z.string().optional(),
  sort_order: z.number().int().default(0),
});
export type ProductImageCreateInput = z.infer<typeof productImageCreateSchema>;

export const productImageUpdateSchema = z.object({
  url: urlSchema.optional(),
  alt_text: z.string().optional(),
  sort_order: z.number().int().optional(),
});
export type ProductImageUpdateInput = z.infer<typeof productImageUpdateSchema>;

// ============================================================
// PRODUCT VARIANTS
// ============================================================

export const productVariantCreateSchema = z.object({
  product_id: z.number().int().positive("Product is required"),
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().optional(),
  price: z.number().positive("Price must be positive").optional(),
  compare_at_price: z
    .number()
    .positive("Compare-at price must be positive")
    .optional(),
  stock_quantity: z.number().int().min(0).default(0),
  options: z.record(z.string(), z.string()),
  image_url: urlSchema.optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});
export type ProductVariantCreateInput = z.infer<
  typeof productVariantCreateSchema
>;

export const productVariantUpdateSchema = z.object({
  name: z.string().min(1, "Variant name is required").optional(),
  sku: z.string().optional(),
  price: z.number().positive("Price must be positive").optional(),
  compare_at_price: z
    .number()
    .positive("Compare-at price must be positive")
    .optional(),
  stock_quantity: z.number().int().min(0).optional(),
  options: z.record(z.string(), z.string()).optional(),
  image_url: urlSchema.optional().or(z.literal("")),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});
export type ProductVariantUpdateInput = z.infer<
  typeof productVariantUpdateSchema
>;

// ============================================================
// CHECKOUT (Storefront)
// Client-side form schema — server-computed fields (order_number,
// subtotal, total, created_by) are NOT included here.
// ============================================================

export const checkoutFormSchema = z
  .object({
    // Customer
    customer_email: emailSchema,
    customer_first_name: z.string().min(1, "First name is required"),
    customer_last_name: z.string().min(1, "Last name is required"),
    customer_phone: z.string().optional(),

    // Shipping address
    shipping_address_line1: z.string().min(1, "Shipping address is required"),
    shipping_address_line2: z.string().optional(),
    shipping_city: z.string().min(1, "City is required"),
    shipping_state: z.string().optional(),
    shipping_postal_code: z.string().min(1, "Postal code is required"),
    shipping_country: z
      .string()
      .min(2, "Country is required")
      .max(2, "Country must be a 2-letter code")
      .toUpperCase(),

    // Billing address — either "same as shipping" or separate
    billing_same_as_shipping: z.boolean().default(true),
    billing_address_line1: z.string().optional(),
    billing_address_line2: z.string().optional(),
    billing_city: z.string().optional(),
    billing_state: z.string().optional(),
    billing_postal_code: z.string().optional(),
    billing_country: z.string().optional(),

    // Shipping method
    shipping_method_id: z
      .number()
      .int()
      .positive("Please select a shipping method"),
    shipping_method_name: z.string().min(1),
    shipping_cost: z.number().min(0),

    // Payment
    payment_method_id: z.number().int().positive().optional().nullable(),
    payment_method: z.string().min(1, "Please select a payment method"),
    payment_method_name: z.string().optional(),

    // Coupon (optional, validated server-side)
    coupon_code: z.string().optional(),

    // Notes
    customer_notes: z.string().optional(),

    // Cart items — sent from client so we can validate server-side
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          variantId: z.number().int().positive().optional().nullable(),
          productName: z.string().min(1),
          variantName: z.string().optional().nullable(),
          sku: z.string().optional().nullable(),
          unitPrice: z.number().min(0),
          quantity: z.number().int().positive(),
          imageUrl: z.string().optional().nullable(),
          options: z.record(z.string(), z.string()).optional().nullable(),
        }),
      )
      .min(1, "Your cart is empty"),
  })
  .refine(
    (data) => {
      // If billing is NOT same as shipping, require billing fields
      if (!data.billing_same_as_shipping) {
        return (
          !!data.billing_address_line1 &&
          !!data.billing_city &&
          !!data.billing_postal_code &&
          !!data.billing_country
        );
      }
      return true;
    },
    {
      message: "Billing address is required when different from shipping",
      path: ["billing_address_line1"],
    },
  );

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

// ============================================================
// PAYMENT METHODS
// ============================================================

const paymentProviders = [
  "cash_on_delivery",
  "stripe",
  "paypal",
  "square",
  "razorpay",
] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export const paymentMethodCreateSchema = z.object({
  name: z.string().min(1, "Payment method name is required"),
  description: z.string().optional().nullable(),
  provider: z.enum(paymentProviders, {
    error: () => ({ message: "Please select a valid provider" }),
  }),
  provider_config: z.record(z.string(), z.unknown()).optional().nullable(),
  extra_charge: z.coerce
    .number()
    .min(0, "Extra charge must be 0 or greater")
    .optional()
    .nullable(),
  instructions: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});
export type PaymentMethodCreateInput = z.infer<
  typeof paymentMethodCreateSchema
>;

export const paymentMethodUpdateSchema = z.object({
  name: z.string().min(1, "Payment method name is required").optional(),
  description: z.string().optional().nullable(),
  provider: z
    .enum(paymentProviders, {
      error: () => ({ message: "Please select a valid provider" }),
    })
    .optional(),
  provider_config: z.record(z.string(), z.unknown()).optional().nullable(),
  extra_charge: z.coerce.number().min(0).optional().nullable(),
  instructions: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});
export type PaymentMethodUpdateInput = z.infer<
  typeof paymentMethodUpdateSchema
>;

// ============================================================
// MEDIA MANAGEMENT SCHEMAS
// ============================================================

export const deleteMediaSchema = z.object({
  relativePath: z.string().min(1, "File relative path is required"),
});
export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>;

export const mediaTargetTypes = [
  "category",
  "product_feature",
  "product_gallery",
  "product_variant",
  "site_logo_light",
  "site_logo_dark",
  "site_favicon",
] as const;

export const reconnectMediaSchema = z.object({
  relativePath: z.string().min(1, "Relative path is required"),
  targetType: z.enum(mediaTargetTypes, {
    error: () => ({ message: "Please select a valid target type" }),
  }),
  targetId: z.coerce.number().int().positive().optional().nullable(),
  altText: z.string().optional().nullable(),
});
export type ReconnectMediaInput = z.infer<typeof reconnectMediaSchema>;

export const clearBrokenMediaSchema = z.object({
  targetType: z.enum(mediaTargetTypes, {
    error: () => ({ message: "Please select a valid target type" }),
  }),
  targetId: z.coerce.number().int().positive().optional().nullable(),
  galleryImageId: z.coerce.number().int().positive().optional().nullable(),
});
export type ClearBrokenMediaInput = z.infer<typeof clearBrokenMediaSchema>;

export const bulkDeleteMediaSchema = z.object({
  relativePaths: z
    .array(z.string().min(1, "File path cannot be empty"))
    .min(1, "Please select at least one file to delete"),
});
export type BulkDeleteMediaInput = z.infer<typeof bulkDeleteMediaSchema>;

// ============================================================
// INVOICES
// ============================================================

export const invoiceFormSchema = z.object({
  order_id: z.number().int().positive("Please select an order"),
  status: z.enum(["draft", "issued", "paid", "cancelled"]),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: emailSchema,
  subtotal: z.number().min(0, "Subtotal must be positive"),
  tax_amount: z.number().min(0),
  shipping_cost: z.number().min(0),
  discount_amount: z.number().min(0),
  total: z.number().min(0, "Total must be positive"),
  currency: z.string().min(1),
  notes: z.string().optional().nullable(),
  due_at: z.string().optional().nullable(),
  paid_at: z.string().optional().nullable(),
});
export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;

export const invoiceCreateSchema = invoiceFormSchema;
export type InvoiceCreateInput = InvoiceFormInput;

export const invoiceUpdateSchema = invoiceFormSchema.partial();
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

// ============================================================
// SENT EMAILS
// ============================================================

export const sentEmailCreateSchema = z.object({
  type: z.string().default("invoice"),
  sender_email: emailSchema,
  recipient_email: emailSchema,
  recipient_name: z.string().optional().nullable(),
  subject: z.string().min(1, "Subject is required"),
  order_number: z.string().optional().nullable(),
  status: z.enum(["pending", "successful", "failed"]).default("pending"),
  error_message: z.string().optional().nullable(),
  body_html: z.string().min(1, "Email body HTML is required"),
  invoice_id: z.coerce.number().int().positive().optional().nullable(),
  order_id: z.coerce.number().int().positive().optional().nullable(),
});
export type SentEmailCreateInput = z.infer<typeof sentEmailCreateSchema>;

export const sentEmailUpdateSchema = z.object({
  status: z.enum(["pending", "successful", "failed"]).optional(),
  error_message: z.string().optional().nullable(),
  body_html: z.string().optional(),
});
export type SentEmailUpdateInput = z.infer<typeof sentEmailUpdateSchema>;
