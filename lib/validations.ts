import { z } from "zod";

// ============================================================
// PRIMITIVES & SHARED SCHEMAS
// ============================================================

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long")
  .max(128, "Password cannot exceed 128 characters");

const emailSchema = z
  .email("Please enter a valid email address")
  .trim()
  .max(254, "Email address cannot exceed 254 characters");

export const EmailSchema = z.object({ email: emailSchema });

const emailObject = z.object({
  email: emailSchema,
});

export type EmailInput = z.infer<typeof emailObject>;

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(200, "Slug cannot exceed 200 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase with hyphens only",
  );

const urlSchema = z
  .string()
  .trim()
  .max(2048, "URL cannot exceed 2048 characters")
  .refine((val) => {
    if (!val) return true;
    if (val.startsWith("/")) return !val.includes("..") && !val.includes("\0");
    try {
      const parsed = new URL(val);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Please enter a valid URL (http://, https://, or safe relative path)");

const phoneSchema = z
  .string()
  .trim()
  .max(50, "Phone number cannot exceed 50 characters")
  .regex(/^[+\d\s()\-.]*$/, "Phone number contains invalid characters");

const colorHexSchema = z
  .string()
  .trim()
  .max(7, "Hex color code cannot exceed 7 characters")
  .regex(/^#[0-9a-fA-F]{6}$/, "Please enter a valid hex color (e.g. #0f0f0f)");

export const relativePathSchema = z
  .string()
  .trim()
  .min(1, "File relative path is required")
  .max(500, "File path cannot exceed 500 characters")
  .refine(
    (path) =>
      !path.includes("..") && !path.includes("\0") && !path.startsWith("/"),
    "Invalid file path or path traversal detected",
  );

export const metaInfoSchema = z
  .object({
    title: z
      .string()
      .trim()
      .max(255, "Meta title cannot exceed 255 characters")
      .optional()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(1000, "Meta description cannot exceed 1000 characters")
      .optional()
      .or(z.literal("")),
    keywords: z
      .string()
      .trim()
      .max(500, "Keywords cannot exceed 500 characters")
      .optional()
      .or(z.literal("")),
    og_title: z
      .string()
      .trim()
      .max(255, "OG title cannot exceed 255 characters")
      .optional()
      .or(z.literal("")),
    og_description: z
      .string()
      .trim()
      .max(1000, "OG description cannot exceed 1000 characters")
      .optional()
      .or(z.literal("")),
    og_image: urlSchema.optional().or(z.literal("")),
  })
  .default({});

export type MetaInfoInput = z.infer<typeof metaInfoSchema>;

const socialLinksSchema = z
  .object({
    twitter: urlSchema.optional().or(z.literal("")),
    instagram: urlSchema.optional().or(z.literal("")),
    facebook: urlSchema.optional().or(z.literal("")),
    youtube: urlSchema.optional().or(z.literal("")),
    tiktok: urlSchema.optional().or(z.literal("")),
  })
  .default({});

export const idSchema = z.object({
  id: z.number().int().positive().max(2147483647),
});

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
  role_name: z
    .string()
    .trim()
    .min(1, "Please select a role")
    .max(100, "Role name is too long"),
  is_active: z.boolean(),
  name: z
    .string()
    .trim()
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  password: z.union([z.literal(""), passwordSchema]).optional(),
  role_name: z
    .string()
    .trim()
    .min(1, "Please select a role")
    .max(100, "Role name is too long")
    .optional(),
  is_active: z.boolean().optional(),
  name: z
    .string()
    .trim()
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// ============================================================
// ROLES
// ============================================================

export const roleCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(100, "Role name cannot exceed 100 characters"),
  is_active: z.boolean().default(true),
});
export type RoleCreateInput = z.infer<typeof roleCreateSchema>;

export const roleUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(100, "Role name cannot exceed 100 characters")
    .optional(),
  is_active: z.boolean().optional(),
});
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;

// ============================================================
// SITE FEATURES
// ============================================================

export const siteFeatureCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Feature name is required")
    .max(100, "Feature name cannot exceed 100 characters"),
  path: z
    .string()
    .trim()
    .min(1, "Path is required")
    .max(255, "Path cannot exceed 255 characters")
    .regex(
      /^\/[a-zA-Z0-9_\-\/*]*$/,
      "Path must be a valid relative path starting with /",
    ),
  enabled: z.boolean(),
  is_super: z.boolean().default(false),
});
export type SiteFeatureCreateInput = z.infer<typeof siteFeatureCreateSchema>;

export const siteFeatureUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Feature name is required")
    .max(100, "Feature name cannot exceed 100 characters")
    .optional(),
  path: z
    .string()
    .trim()
    .min(1, "Path is required")
    .max(255, "Path cannot exceed 255 characters")
    .regex(
      /^\/[a-zA-Z0-9_\-\/*]*$/,
      "Path must be a valid relative path starting with /",
    )
    .optional(),
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
  site_feature_id: z
    .number()
    .int()
    .positive("Site feature is required")
    .max(2147483647),
  role_id: z.number().int().positive("Role is required").max(2147483647),
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
  name: z
    .string()
    .trim()
    .min(1, "Store name is required")
    .max(255, "Store name cannot exceed 255 characters"),
  tagline: z
    .string()
    .trim()
    .max(255, "Tagline cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .or(z.literal("")),
  site_url: urlSchema.optional().or(z.literal("")),

  // Header & Home hero
  topbar_message: z
    .string()
    .trim()
    .max(500, "Topbar message cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  home_tagline_label: z
    .string()
    .trim()
    .max(255, "Tagline label cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),

  // Branding
  light_logo_url: urlSchema.optional().or(z.literal("")),
  dark_logo_url: urlSchema.optional().or(z.literal("")),
  favicon_url: urlSchema.optional().or(z.literal("")),
  primary_color: colorHexSchema.default("#18181b"),
  secondary_color: colorHexSchema.default("#27272a"),
  accent_color: colorHexSchema.default("#f59e0b"),

  // Localisation
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter ISO code")
    .toUpperCase()
    .default("USD"),
  currency_symbol: z
    .string()
    .trim()
    .min(1, "Currency symbol is required")
    .max(10, "Currency symbol cannot exceed 10 characters")
    .default("$"),

  // Contact
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(500, "Address cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),

  social_links: socialLinksSchema,

  // Business identity
  business_name: z
    .string()
    .trim()
    .max(255, "Business name cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  business_registration_number: z
    .string()
    .trim()
    .max(100, "Registration number cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  tax_rate: z.preprocess(
    (val) =>
      val === "" || val === undefined || val === null ? undefined : Number(val),
    z.number().min(0).max(1, "Tax rate must be between 0 and 1").optional(),
  ),
  tax_inclusive: z.boolean().default(false),
  tax_label: z
    .string()
    .trim()
    .max(50, "Tax label cannot exceed 50 characters")
    .default("Tax"),

  // Checkout
  require_phone: z.boolean().default(false),
  allow_order_notes: z.boolean().default(true),

  header_config: z
    .record(z.string().max(100), z.unknown())
    .optional()
    .default({}),
  footer_config: z
    .record(z.string().max(100), z.unknown())
    .optional()
    .default({}),

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
  title: z
    .string()
    .trim()
    .min(1, "Page title is required")
    .max(255, "Title cannot exceed 255 characters"),
  content: z
    .string()
    .min(1, "Page content is required")
    .max(500000, "Page content cannot exceed 500KB"),
  is_active: z.boolean().default(true),
  show_in_header: z.boolean().default(false),
  show_in_footer: z.boolean().default(true),
  sort_order: z.number().int().min(-10000).max(10000).default(0),
  theme_config: z
    .record(z.string().max(100), z.unknown())
    .optional()
    .default({}),
  components_config: z
    .array(z.record(z.string().max(100), z.unknown()))
    .optional()
    .default([]),
  meta_info: metaInfoSchema,
});
export type SitePageCreateInput = z.infer<typeof sitePageCreateSchema>;

export const sitePageUpdateSchema = sitePageCreateSchema.partial();
export type SitePageUpdateInput = z.infer<typeof sitePageUpdateSchema>;

// ============================================================
// SITE COMPONENTS (site_component)
// ============================================================

export const siteComponentCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Component name is required")
    .max(255, "Component name cannot exceed 255 characters"),
  component_key: z
    .string()
    .trim()
    .min(1, "Component key is required")
    .max(100, "Component key cannot exceed 100 characters")
    .regex(/^[a-z0-9_]+$/, "Component key must be lowercase with underscores"),
  category: z
    .string()
    .trim()
    .min(1, "Category is required")
    .max(50, "Category cannot exceed 50 characters")
    .default("section"),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .nullable(),
  default_props: z
    .record(z.string().max(100), z.unknown())
    .optional()
    .default({}),
  thumbnail_url: urlSchema.optional().nullable(),
  is_active: z.boolean().default(true),
});
export type SiteComponentCreateInput = z.infer<
  typeof siteComponentCreateSchema
>;

export const siteComponentUpdateSchema = siteComponentCreateSchema.partial();
export type SiteComponentUpdateInput = z.infer<
  typeof siteComponentUpdateSchema
>;

// ============================================================
// EMAIL CONFIG
// ============================================================

export const emailConfigCreateSchema = z.object({
  provider: z.enum(["smtp", "resend", "sendgrid", "ses"]).default("smtp"),

  from_name: z
    .string()
    .trim()
    .min(1, "Sender name is required")
    .max(100, "Sender name cannot exceed 100 characters"),
  from_email: emailSchema,
  reply_to_email: emailSchema.optional().or(z.literal("")),

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
// SHIPPING METHODS
// ============================================================

export const shippingMethodCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Shipping method name is required")
      .max(255, "Name cannot exceed 255 characters"),
    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional()
      .nullable(),
    price: z.coerce
      .number()
      .min(0, "Price must be 0 or greater")
      .max(1000000, "Price is too high"),
    free_over: z.coerce
      .number()
      .min(0)
      .max(1000000, "Free over amount is too high")
      .optional()
      .nullable(),
    estimated_days_min: z.coerce
      .number()
      .int()
      .min(0)
      .max(365, "Min days cannot exceed 365")
      .optional()
      .nullable(),
    estimated_days_max: z.coerce
      .number()
      .int()
      .min(0)
      .max(365, "Max days cannot exceed 365")
      .optional()
      .nullable(),
    is_active: z.boolean().default(true),
    sort_order: z.coerce.number().int().min(-10000).max(10000).default(0),
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
    name: z
      .string()
      .trim()
      .min(1, "Shipping method name is required")
      .max(255, "Name cannot exceed 255 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional()
      .nullable(),
    price: z.coerce
      .number()
      .min(0, "Price must be 0 or greater")
      .max(1000000, "Price is too high")
      .optional(),
    free_over: z.coerce
      .number()
      .min(0)
      .max(1000000, "Free over amount is too high")
      .optional()
      .nullable(),
    estimated_days_min: z.coerce
      .number()
      .int()
      .min(0)
      .max(365, "Min days cannot exceed 365")
      .optional()
      .nullable(),
    estimated_days_max: z.coerce
      .number()
      .int()
      .min(0)
      .max(365, "Max days cannot exceed 365")
      .optional()
      .nullable(),
    is_active: z.boolean().optional(),
    sort_order: z.coerce.number().int().min(-10000).max(10000).optional(),
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
      .trim()
      .min(1, "Coupon code is required")
      .max(50, "Coupon code cannot exceed 50 characters")
      .regex(
        /^[A-Za-z0-9_\-]+$/,
        "Coupon code can only contain letters, numbers, hyphens, and underscores",
      )
      .transform((val) => val.toUpperCase().trim()),
    discount_type: z.enum(["percentage", "fixed_amount"]),
    discount_value: z.coerce
      .number()
      .positive("Discount value must be positive")
      .max(1000000, "Discount value is too high"),
    minimum_order_amount: z
      .preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : val),
        z.coerce
          .number()
          .min(0, "Minimum order amount cannot be negative")
          .max(1000000, "Minimum order amount is too high")
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
          .max(1000000000, "Max uses is too high")
          .nullable(),
      )
      .optional(),
    max_uses_per_email: z.coerce
      .number()
      .int("Max uses per email must be an integer")
      .min(1, "Max uses per email must be at least 1")
      .max(100000, "Max uses per email is too high")
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
      .trim()
      .min(1, "Coupon code is required")
      .max(50, "Coupon code cannot exceed 50 characters")
      .regex(
        /^[A-Za-z0-9_\-]+$/,
        "Coupon code can only contain letters, numbers, hyphens, and underscores",
      )
      .transform((val) => val.toUpperCase().trim())
      .optional(),
    discount_type: z.enum(["percentage", "fixed_amount"]).optional(),
    discount_value: z.coerce
      .number()
      .positive("Discount value must be positive")
      .max(1000000, "Discount value is too high")
      .optional(),
    minimum_order_amount: z
      .preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : val),
        z.coerce
          .number()
          .min(0, "Minimum order amount cannot be negative")
          .max(1000000, "Minimum order amount is too high")
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
          .max(1000000000, "Max uses is too high")
          .nullable(),
      )
      .optional(),
    max_uses_per_email: z.coerce
      .number()
      .int("Max uses per email must be an integer")
      .min(1, "Max uses per email must be at least 1")
      .max(100000, "Max uses per email is too high")
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
  customer_first_name: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name cannot exceed 100 characters"),
  customer_last_name: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name cannot exceed 100 characters"),
  customer_phone: phoneSchema.optional().or(z.literal("")),
  customer_ip: z.string().trim().max(45, "IP address too long").optional(),
  customer_user_agent: z
    .string()
    .trim()
    .max(500, "User agent too long")
    .optional(),

  // Billing address
  billing_address_line1: z
    .string()
    .trim()
    .min(1, "Billing address is required")
    .max(255, "Address line 1 cannot exceed 255 characters"),
  billing_address_line2: z
    .string()
    .trim()
    .max(255, "Address line 2 cannot exceed 255 characters")
    .optional(),
  billing_city: z
    .string()
    .trim()
    .min(1, "Billing city is required")
    .max(100, "City cannot exceed 100 characters"),
  billing_state: z
    .string()
    .trim()
    .max(100, "State cannot exceed 100 characters")
    .optional(),
  billing_postal_code: z
    .string()
    .trim()
    .min(1, "Billing postal code is required")
    .max(20, "Postal code cannot exceed 20 characters")
    .regex(/^[A-Za-z0-9\s\-]+$/, "Invalid postal code format"),
  billing_country: z
    .string()
    .trim()
    .length(2, "Country must be a 2-letter ISO code")
    .toUpperCase(),

  // Shipping address
  shipping_address_line1: z
    .string()
    .trim()
    .min(1, "Shipping address is required")
    .max(255, "Address line 1 cannot exceed 255 characters"),
  shipping_address_line2: z
    .string()
    .trim()
    .max(255, "Address line 2 cannot exceed 255 characters")
    .optional(),
  shipping_city: z
    .string()
    .trim()
    .min(1, "Shipping city is required")
    .max(100, "City cannot exceed 100 characters"),
  shipping_state: z
    .string()
    .trim()
    .max(100, "State cannot exceed 100 characters")
    .optional(),
  shipping_postal_code: z
    .string()
    .trim()
    .min(1, "Shipping postal code is required")
    .max(20, "Postal code cannot exceed 20 characters")
    .regex(/^[A-Za-z0-9\s\-]+$/, "Invalid postal code format"),
  shipping_country: z
    .string()
    .trim()
    .length(2, "Country must be a 2-letter ISO code")
    .toUpperCase(),

  // Shipping method
  shipping_method_id: z.number().int().positive().max(2147483647).optional(),
  shipping_method_name: z
    .string()
    .trim()
    .min(1, "Shipping method name is required")
    .max(255, "Method name too long"),
  shipping_cost: z.number().min(0).max(1000000),

  // Coupon
  coupon_id: z.number().int().positive().max(2147483647).optional(),
  coupon_code: z.string().trim().max(50).optional(),
  discount_amount: z.number().min(0).max(100000000).default(0),

  // Totals
  subtotal: z.number().min(0).max(100000000),
  tax_amount: z.number().min(0).max(100000000).default(0),
  total: z.number().min(0).max(100000000),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter ISO code")
    .toUpperCase()
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
  admin_notes: z
    .string()
    .trim()
    .max(2000, "Admin notes cannot exceed 2000 characters")
    .optional(),
  customer_notes: z
    .string()
    .trim()
    .max(2000, "Customer notes cannot exceed 2000 characters")
    .optional(),
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
  tracking_number: z
    .string()
    .trim()
    .max(100, "Tracking number cannot exceed 100 characters")
    .optional(),
  tracking_url: urlSchema.optional().or(z.literal("")),
  carrier_name: z
    .string()
    .trim()
    .max(100, "Carrier name cannot exceed 100 characters")
    .optional(),
  shipped_at: z.string().datetime().optional(),
  delivered_at: z.string().datetime().optional(),
  admin_notes: z
    .string()
    .trim()
    .max(2000, "Admin notes cannot exceed 2000 characters")
    .optional(),
  cancelled_at: z.string().datetime().optional(),
  paid_at: z.string().datetime().optional(),
});
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;

// ============================================================
// ORDER REFUNDS
// ============================================================

export const orderRefundCreateSchema = z.object({
  order_id: z.number().int().positive("Order is required").max(2147483647),
  amount: z.number().positive("Refund amount must be positive").max(100000000),
  reason: z
    .string()
    .trim()
    .max(1000, "Reason cannot exceed 1000 characters")
    .optional(),
  provider_refund_id: z
    .string()
    .trim()
    .max(255, "Refund ID cannot exceed 255 characters")
    .optional(),
  status: z.enum(["pending", "succeeded", "failed"]).default("pending"),
  refunded_at: z.string().datetime().optional(),
});
export type OrderRefundCreateInput = z.infer<typeof orderRefundCreateSchema>;

export const orderRefundUpdateSchema = z.object({
  status: z.enum(["pending", "succeeded", "failed"]).optional(),
  provider_refund_id: z
    .string()
    .trim()
    .max(255, "Refund ID cannot exceed 255 characters")
    .optional(),
  refunded_at: z.string().datetime().optional(),
});
export type OrderRefundUpdateInput = z.infer<typeof orderRefundUpdateSchema>;

// ============================================================
// CATEGORIES
// ============================================================

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(255, "Category name cannot exceed 255 characters"),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .or(z.literal("")),
  image_url: urlSchema.optional().or(z.literal("")),
  image_alt_text: z
    .string()
    .trim()
    .max(255, "Alt text cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  bg_color: colorHexSchema.optional().or(z.literal("")),
  show_in_header: z.boolean().default(true),
  show_in_footer: z.boolean().default(true),
  show_in_home: z.boolean().default(true),
  parent_id: z.number().int().positive().max(2147483647).optional(),
  sort_order: z.number().int().min(-10000).max(10000).default(0),
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
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(255, "Product name cannot exceed 255 characters"),
  slug: slugSchema,
  description: z
    .string()
    .max(50000, "Description cannot exceed 50KB")
    .optional()
    .or(z.literal("")),
  short_description: z
    .string()
    .trim()
    .max(2000, "Short description cannot exceed 2000 characters")
    .optional()
    .or(z.literal("")),
  feature_image_url: urlSchema.optional().or(z.literal("")),
  feature_image_alt_text: z
    .string()
    .trim()
    .max(255, "Alt text cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),

  price: z
    .number()
    .positive("Price must be positive")
    .max(1000000, "Price is too high"),
  compare_at_price: z
    .number()
    .positive("Compare-at price must be positive")
    .max(1000000, "Compare-at price is too high")
    .optional(),
  cost_price: z
    .number()
    .positive("Cost price must be positive")
    .max(1000000, "Cost price is too high")
    .optional(),

  sku: z
    .string()
    .trim()
    .max(100, "SKU cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  stock_quantity: z.number().int().min(0).max(1000000).default(0),
  low_stock_threshold: z.number().int().min(0).max(100000).default(5),
  track_inventory: z.boolean().default(true),

  weight: z.number().positive().max(100000).optional(),
  dimensions: z
    .object({
      length: z.number().positive().max(10000).optional(),
      width: z.number().positive().max(10000).optional(),
      height: z.number().positive().max(10000).optional(),
    })
    .optional(),

  category_id: z.number().int().positive().max(2147483647).optional(),

  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(-10000).max(10000).default(0),

  meta_info: metaInfoSchema,
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

// ============================================================
// PRODUCT IMAGES
// ============================================================

export const productImageCreateSchema = z.object({
  product_id: z.number().int().positive("Product is required").max(2147483647),
  url: urlSchema,
  alt_text: z
    .string()
    .trim()
    .max(255, "Alt text cannot exceed 255 characters")
    .optional(),
  sort_order: z.number().int().min(-10000).max(10000).default(0),
});
export type ProductImageCreateInput = z.infer<typeof productImageCreateSchema>;

export const productImageUpdateSchema = z.object({
  url: urlSchema.optional(),
  alt_text: z
    .string()
    .trim()
    .max(255, "Alt text cannot exceed 255 characters")
    .optional(),
  sort_order: z.number().int().min(-10000).max(10000).optional(),
});
export type ProductImageUpdateInput = z.infer<typeof productImageUpdateSchema>;

// ============================================================
// PRODUCT VARIANTS
// ============================================================

export const productVariantCreateSchema = z.object({
  product_id: z.number().int().positive("Product is required").max(2147483647),
  name: z
    .string()
    .trim()
    .min(1, "Variant name is required")
    .max(255, "Variant name cannot exceed 255 characters"),
  sku: z
    .string()
    .trim()
    .max(100, "SKU cannot exceed 100 characters")
    .optional(),
  price: z.number().positive("Price must be positive").max(1000000).optional(),
  compare_at_price: z
    .number()
    .positive("Compare-at price must be positive")
    .max(1000000)
    .optional(),
  stock_quantity: z.number().int().min(0).max(1000000).default(0),
  options: z.record(z.string().trim().max(50), z.string().trim().max(100)),
  image_url: urlSchema.optional().or(z.literal("")),
  image_url_alt_text: z
    .string()
    .trim()
    .max(255, "Alt text cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(-10000).max(10000).default(0),
});
export type ProductVariantCreateInput = z.infer<
  typeof productVariantCreateSchema
>;

export const productVariantUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Variant name is required")
    .max(255, "Variant name cannot exceed 255 characters")
    .optional(),
  sku: z
    .string()
    .trim()
    .max(100, "SKU cannot exceed 100 characters")
    .optional(),
  price: z.number().positive("Price must be positive").max(1000000).optional(),
  compare_at_price: z
    .number()
    .positive("Compare-at price must be positive")
    .max(1000000)
    .optional(),
  stock_quantity: z.number().int().min(0).max(1000000).optional(),
  options: z
    .record(z.string().trim().max(50), z.string().trim().max(100))
    .optional(),
  image_url: urlSchema.optional().or(z.literal("")),
  image_url_alt_text: z
    .string()
    .trim()
    .max(255, "Alt text cannot exceed 255 characters")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(-10000).max(10000).optional(),
});
export type ProductVariantUpdateInput = z.infer<
  typeof productVariantUpdateSchema
>;

// ============================================================
// PAYMENT TRANSACTIONS (payment_transaction)
// ============================================================

export const paymentTransactionCreateSchema = z.object({
  order_id: z.number().int().positive("Order ID is required").max(2147483647),
  provider: z
    .string()
    .trim()
    .min(1, "Provider is required")
    .max(50, "Provider cannot exceed 50 characters"),
  provider_transaction_id: z.string().trim().max(255).optional().nullable(),
  provider_session_id: z.string().trim().max(255).optional().nullable(),
  provider_status: z.string().trim().max(50).optional().nullable(),
  amount: z.number().positive("Amount must be positive").max(100000000),
  currency: z.string().trim().length(3).toUpperCase().default("USD"),
  status: z
    .enum(["pending", "completed", "failed", "cancelled"])
    .default("pending"),
  raw_response: z
    .record(z.string().max(100), z.unknown())
    .optional()
    .nullable(),
  confirmed_by: z
    .number()
    .int()
    .positive()
    .max(2147483647)
    .optional()
    .nullable(),
  confirmed_at: z.string().datetime().optional().nullable(),
});
export type PaymentTransactionCreateInput = z.infer<
  typeof paymentTransactionCreateSchema
>;

export const paymentTransactionUpdateSchema =
  paymentTransactionCreateSchema.partial();
export type PaymentTransactionUpdateInput = z.infer<
  typeof paymentTransactionUpdateSchema
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
    customer_first_name: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(100, "First name cannot exceed 100 characters"),
    customer_last_name: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(100, "Last name cannot exceed 100 characters"),
    customer_phone: phoneSchema.optional().or(z.literal("")),

    // Shipping address
    shipping_address_line1: z
      .string()
      .trim()
      .min(1, "Shipping address is required")
      .max(255, "Address line 1 cannot exceed 255 characters"),
    shipping_address_line2: z
      .string()
      .trim()
      .max(255, "Address line 2 cannot exceed 255 characters")
      .optional(),
    shipping_city: z
      .string()
      .trim()
      .min(1, "City is required")
      .max(100, "City cannot exceed 100 characters"),
    shipping_state: z
      .string()
      .trim()
      .max(100, "State cannot exceed 100 characters")
      .optional(),
    shipping_postal_code: z
      .string()
      .trim()
      .min(1, "Postal code is required")
      .max(20, "Postal code cannot exceed 20 characters")
      .regex(/^[A-Za-z0-9\s\-]+$/, "Invalid postal code format"),
    shipping_country: z
      .string()
      .trim()
      .min(2, "Country is required")
      .max(2, "Country must be a 2-letter code")
      .toUpperCase(),

    // Billing address — either "same as shipping" or separate
    billing_same_as_shipping: z.boolean().default(true),
    billing_address_line1: z
      .string()
      .trim()
      .max(255, "Billing address line 1 cannot exceed 255 characters")
      .optional(),
    billing_address_line2: z
      .string()
      .trim()
      .max(255, "Billing address line 2 cannot exceed 255 characters")
      .optional(),
    billing_city: z
      .string()
      .trim()
      .max(100, "Billing city cannot exceed 100 characters")
      .optional(),
    billing_state: z
      .string()
      .trim()
      .max(100, "Billing state cannot exceed 100 characters")
      .optional(),
    billing_postal_code: z
      .string()
      .trim()
      .max(20, "Billing postal code cannot exceed 20 characters")
      .regex(/^[A-Za-z0-9\s\-]*$/, "Invalid billing postal code format")
      .optional(),
    billing_country: z
      .string()
      .trim()
      .max(2, "Billing country must be a 2-letter code")
      .toUpperCase()
      .optional(),

    // Shipping method
    shipping_method_id: z
      .number()
      .int()
      .positive("Please select a shipping method")
      .max(2147483647),
    shipping_method_name: z.string().trim().min(1).max(255),
    shipping_cost: z.number().min(0).max(1000000),

    // Payment
    payment_method_id: z
      .number()
      .int()
      .positive()
      .max(2147483647)
      .optional()
      .nullable(),
    payment_method: z
      .string()
      .trim()
      .min(1, "Please select a payment method")
      .max(50),
    payment_method_name: z.string().trim().max(255).optional(),

    // Coupon (optional, validated server-side)
    coupon_code: z.string().trim().max(50).optional(),

    // Notes
    customer_notes: z
      .string()
      .trim()
      .max(2000, "Customer notes cannot exceed 2000 characters")
      .optional(),

    // Cart items — sent from client so we can validate server-side
    items: z
      .array(
        z.object({
          productId: z.number().int().positive().max(2147483647),
          variantId: z
            .number()
            .int()
            .positive()
            .max(2147483647)
            .optional()
            .nullable(),
          productName: z.string().trim().min(1).max(255),
          variantName: z.string().trim().max(255).optional().nullable(),
          sku: z.string().trim().max(100).optional().nullable(),
          unitPrice: z.number().min(0).max(1000000),
          quantity: z.number().int().positive().max(10000),
          imageUrl: urlSchema.optional().nullable(),
          options: z
            .record(z.string().trim().max(50), z.string().trim().max(100))
            .optional()
            .nullable(),
        }),
      )
      .min(1, "Your cart is empty")
      .max(100, "Cart cannot exceed 100 items"),
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
  name: z
    .string()
    .trim()
    .min(1, "Payment method name is required")
    .max(255, "Name cannot exceed 255 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .nullable(),
  provider: z.enum(paymentProviders, {
    error: () => ({ message: "Please select a valid provider" }),
  }),
  provider_config: z
    .record(z.string().max(100), z.unknown())
    .optional()
    .nullable(),
  extra_charge: z.coerce
    .number()
    .min(0, "Extra charge must be 0 or greater")
    .max(100000, "Extra charge is too high")
    .optional()
    .nullable(),
  instructions: z
    .string()
    .trim()
    .max(5000, "Instructions cannot exceed 5000 characters")
    .optional()
    .nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(-10000).max(10000).default(0),
});
export type PaymentMethodCreateInput = z.infer<
  typeof paymentMethodCreateSchema
>;

export const paymentMethodUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Payment method name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .nullable(),
  provider: z
    .enum(paymentProviders, {
      error: () => ({ message: "Please select a valid provider" }),
    })
    .optional(),
  provider_config: z
    .record(z.string().max(100), z.unknown())
    .optional()
    .nullable(),
  extra_charge: z.coerce
    .number()
    .min(0)
    .max(100000, "Extra charge is too high")
    .optional()
    .nullable(),
  instructions: z
    .string()
    .trim()
    .max(5000, "Instructions cannot exceed 5000 characters")
    .optional()
    .nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(-10000).max(10000).optional(),
});
export type PaymentMethodUpdateInput = z.infer<
  typeof paymentMethodUpdateSchema
>;

// ============================================================
// MEDIA MANAGEMENT SCHEMAS
// ============================================================

export const deleteMediaSchema = z.object({
  relativePath: relativePathSchema,
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
  relativePath: relativePathSchema,
  targetType: z.enum(mediaTargetTypes, {
    error: () => ({ message: "Please select a valid target type" }),
  }),
  targetId: z.coerce
    .number()
    .int()
    .positive()
    .max(2147483647)
    .optional()
    .nullable(),
  altText: z
    .string()
    .trim()
    .max(255, "Alt text cannot exceed 255 characters")
    .optional()
    .nullable(),
});
export type ReconnectMediaInput = z.infer<typeof reconnectMediaSchema>;

export const clearBrokenMediaSchema = z.object({
  targetType: z.enum(mediaTargetTypes, {
    error: () => ({ message: "Please select a valid target type" }),
  }),
  targetId: z.coerce
    .number()
    .int()
    .positive()
    .max(2147483647)
    .optional()
    .nullable(),
  galleryImageId: z.coerce
    .number()
    .int()
    .positive()
    .max(2147483647)
    .optional()
    .nullable(),
});
export type ClearBrokenMediaInput = z.infer<typeof clearBrokenMediaSchema>;

export const bulkDeleteMediaSchema = z.object({
  relativePaths: z
    .array(relativePathSchema)
    .min(1, "Please select at least one file to delete")
    .max(100, "Cannot delete more than 100 files at once"),
});
export type BulkDeleteMediaInput = z.infer<typeof bulkDeleteMediaSchema>;

// ============================================================
// INVOICES
// ============================================================

export const invoiceFormSchema = z.object({
  order_id: z.number().int().positive("Please select an order").max(2147483647),
  status: z.enum(["draft", "issued", "paid", "cancelled"]),
  customer_name: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(200, "Customer name cannot exceed 200 characters"),
  customer_email: emailSchema,
  subtotal: z.number().min(0, "Subtotal must be positive").max(100000000),
  tax_amount: z.number().min(0).max(100000000),
  shipping_cost: z.number().min(0).max(1000000),
  discount_amount: z.number().min(0).max(100000000),
  total: z.number().min(0, "Total must be positive").max(100000000),
  currency: z.string().trim().min(1).max(10),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters")
    .optional()
    .nullable(),
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
  type: z.string().trim().max(50).default("invoice"),
  sender_email: emailSchema,
  recipient_email: emailSchema,
  recipient_name: z
    .string()
    .trim()
    .max(200, "Recipient name cannot exceed 200 characters")
    .optional()
    .nullable(),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(255, "Subject cannot exceed 255 characters"),
  order_number: z
    .string()
    .trim()
    .max(50, "Order number cannot exceed 50 characters")
    .optional()
    .nullable(),
  status: z.enum(["pending", "successful", "failed"]).default("pending"),
  error_message: z
    .string()
    .trim()
    .max(2000, "Error message cannot exceed 2000 characters")
    .optional()
    .nullable(),
  body_html: z
    .string()
    .min(1, "Email body HTML is required")
    .max(500000, "Email body HTML cannot exceed 500KB"),
  invoice_id: z.coerce
    .number()
    .int()
    .positive()
    .max(2147483647)
    .optional()
    .nullable(),
  order_id: z.coerce
    .number()
    .int()
    .positive()
    .max(2147483647)
    .optional()
    .nullable(),
});
export type SentEmailCreateInput = z.infer<typeof sentEmailCreateSchema>;

export const sentEmailUpdateSchema = z.object({
  status: z.enum(["pending", "successful", "failed"]).optional(),
  error_message: z
    .string()
    .trim()
    .max(2000, "Error message cannot exceed 2000 characters")
    .optional()
    .nullable(),
  body_html: z
    .string()
    .max(500000, "Email body HTML cannot exceed 500KB")
    .optional(),
});
export type SentEmailUpdateInput = z.infer<typeof sentEmailUpdateSchema>;
