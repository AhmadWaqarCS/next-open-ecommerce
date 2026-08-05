export type CRUD = {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
};

export type user = {
  id: number;
  email: string;
  role_name: string;
  is_active: boolean;
  name: string | null;
  created_by: number;
  updated_by: number;
  deleted_by?: number | null;
  deleted_at?: Date | null;
};

export type meta_info = {
  title?: string;
  description?: string;
  keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
};

// ─── ROLES ────────────────────────────────────────────────────────────────────

export type role = {
  id: number;
  name: string;
  is_active: boolean;
  created_by: number;
  updated_by: number;
  deleted_by?: number | null;
  deleted_at?: Date | null;
};

export type roleWithPermissions = role & {
  site_feature_roles: {
    site_feature_id: number;
    access_crud: CRUD;
    site_feature: {
      id: number;
      name: string;
      path: string;
      enabled: boolean;
      is_super: boolean;
    };
  }[];
};

export type siteFeature = {
  id: number;
  name: string;
  path: string;
  enabled: boolean;
  is_super: boolean;
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export type category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  image_alt_text: string | null;
  bg_color: string | null;
  meta_info: any;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  created_by: number;
  updated_at: Date;
  updated_by: number;
  deleted_at?: Date | null;
  deleted_by?: number | null;
};

// ─── SHIPPING METHODS ─────────────────────────────────────────────────────────

export type shippingMethod = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  free_over: string | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
  sort_order: number;
};

// ─── COUPONS ──────────────────────────────────────────────────────────────────

export type coupon = {
  id: number;
  code: string;
  discount_type: string;
  discount_value: any;
  minimum_order_amount: any;
  max_uses: number | null;
  max_uses_per_email: number;
  times_used: number;
  starts_at: Date;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  created_by: number;
  updated_at: Date;
  updated_by: number;
  deleted_at?: Date | null;
  deleted_by?: number | null;
};

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export type product_image = {
  id: number;
  product_id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: Date;
  created_by: number;
  updated_at: Date;
  updated_by: number;
  deleted_at?: Date | null;
  deleted_by?: number | null;
};

export type product_variant = {
  id: number;
  product_id: number;
  name: string;
  sku: string | null;
  price: string | number | null;
  compare_at_price: string | number | null;
  stock_quantity: number;
  options: any;
  image_url: string | null;
  image_url_alt_text: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: Date | string;
  created_by?: number;
  updated_at?: Date | string;
  updated_by?: number;
};

export type product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  feature_image_url: string | null;
  feature_image_alt_text: string | null;
  price: string;
  compare_at_price: string | null;
  cost_price: string | null;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  weight: string | null;
  dimensions: any;
  category_id: number | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  meta_info: any;
  images?: product_image[];
  variants?: product_variant[];
  created_at: Date;
  created_by: number;
  updated_at: Date;
  updated_by: number;
  deleted_at?: Date | null;
  deleted_by?: number | null;
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export type order_item = {
  id: number;
  order_id: number;
  product_id?: number | null;
  variant_id?: number | null;
  product_name: string;
  variant_name?: string | null;
  sku?: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
  options?: any;
  image_url?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export type order = {
  id: number;
  order_number: string;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string | null;
  customer_ip?: string | null;
  customer_user_agent?: string | null;

  billing_address_line1?: string;
  billing_address_line2?: string | null;
  billing_city?: string;
  billing_state?: string | null;
  billing_postal_code?: string;
  billing_country?: string;

  shipping_address_line1?: string;
  shipping_address_line2?: string | null;
  shipping_city?: string;
  shipping_state?: string | null;
  shipping_postal_code?: string;
  shipping_country?: string;

  shipping_method_id?: number | null;
  shipping_method_name?: string;
  shipping_cost: string;

  coupon_id?: number | null;
  coupon_code?: string | null;
  discount_amount: string;

  subtotal: string;
  tax_amount: string;
  total: string;
  currency: string;

  payment_method_id?: number | null;
  payment_method: string;
  payment_method_name?: string;
  payment_status: string;
  fulfillment_status: string;

  tracking_number: string | null;
  tracking_url: string | null;
  carrier_name: string | null;
  shipped_at: Date | string | null;
  delivered_at: Date | string | null;

  admin_notes: string | null;
  customer_notes: string | null;

  confirmation_sent_at?: Date | string | null;
  shipping_notified_at?: Date | string | null;

  items?: order_item[];

  placed_at: Date | string;
  paid_at: Date | string | null;
  cancelled_at: Date | string | null;

  created_at?: Date | string;
  created_by?: number;
  updated_at?: Date | string;
  updated_by?: number;
  deleted_at?: Date | string | null;
  deleted_by?: number | null;
};

// ─── NEWSLETTER SUBSCRIBERS ───────────────────────────────────────────────────

export type newsletter_subscriber = {
  id: number;
  email: string;
  created_at: Date;
};
