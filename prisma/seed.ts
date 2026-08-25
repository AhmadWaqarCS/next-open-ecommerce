import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password123";
const STORE_NAME = process.env.STORE_NAME || "Next Open E-Commerce";

async function main() {
  console.log("🩺 [Doctor] Starting database diagnostic check & system initialization…\n");

  await prisma.$transaction(
    async (tx) => {
      // 1. Superadmin Role
      const superadminRole = await tx.role.upsert({
        where: { name: "superadmin" },
        update: { is_active: true },
        create: {
          name: "superadmin",
          is_active: true,
          created_by: 0,
          updated_by: 0,
        },
      });
      console.log(`  ✓ [Role] superadmin verified`);

      // 2. Superadmin Account
      const existingAdmin = await tx.dashboard_user.findUnique({
        where: { email: ADMIN_EMAIL },
      });

      let adminUser;
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        adminUser = await tx.dashboard_user.create({
          data: {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role_id: superadminRole.id,
            role_name: "superadmin",
            is_active: true,
            name: "Administrator",
            created_by: 0,
            updated_by: 0,
          },
        });
        console.log(`  + [User] Superadmin account created (${adminUser.email})`);
      } else {
        adminUser = await tx.dashboard_user.update({
          where: { email: ADMIN_EMAIL },
          data: {
            role_id: superadminRole.id,
            role_name: "superadmin",
            is_active: true,
          },
        });
        console.log(`  ✓ [User] Superadmin account verified (${adminUser.email})`);
      }

      // 3. Dashboard Features & Permissions
      const featuresData = [
        { name: "Dashboard", path: "/dashboard", enabled: true, is_super: false },
        { name: "Orders", path: "/dashboard/orders", enabled: true, is_super: false },
        { name: "Products", path: "/dashboard/products", enabled: true, is_super: false },
        { name: "Categories", path: "/dashboard/categories", enabled: true, is_super: false },
        { name: "Coupons", path: "/dashboard/coupons", enabled: true, is_super: false },
        { name: "Shipping", path: "/dashboard/shipping", enabled: true, is_super: false },
        { name: "Payment Methods", path: "/dashboard/payment-methods", enabled: true, is_super: false },
        { name: "Site Pages", path: "/dashboard/pages", enabled: true, is_super: false },
        { name: "Themes", path: "/dashboard/themes", enabled: true, is_super: false },
        { name: "Invoices", path: "/dashboard/invoices", enabled: true, is_super: false },
        { name: "Sent Emails", path: "/dashboard/sent-emails", enabled: true, is_super: false },
        { name: "Email Config", path: "/dashboard/email-config", enabled: true, is_super: false },
        { name: "Email Templates", path: "/dashboard/email-templates", enabled: true, is_super: false },
        { name: "Customers", path: "/dashboard/customers", enabled: true, is_super: false },
        { name: "Email Groups", path: "/dashboard/email-groups", enabled: true, is_super: false },
        { name: "Email Campaigns", path: "/dashboard/email-campaigns", enabled: true, is_super: false },
        { name: "Site Settings", path: "/dashboard/settings", enabled: true, is_super: false },
        { name: "Media Gallery", path: "/dashboard/media", enabled: true, is_super: false },
        { name: "Storage Options", path: "/dashboard/storages", enabled: true, is_super: false },
        { name: "Roles", path: "/dashboard/roles", enabled: true, is_super: true },
        { name: "Users", path: "/dashboard/users", enabled: true, is_super: true },
        { name: "Activity Logs", path: "/dashboard/activity-logs", enabled: true, is_super: true },
      ];

      const features = [];
      for (const f of featuresData) {
        const feature = await tx.site_feature.upsert({
          where: { path: f.path },
          update: { name: f.name, enabled: f.enabled, is_super: f.is_super },
          create: f,
        });
        features.push(feature);
      }

      const fullCrud = { create: true, read: true, update: true, delete: true };
      for (const feature of features) {
        await tx.site_feature_role.upsert({
          where: {
            site_feature_id_role_id: {
              site_feature_id: feature.id,
              role_id: superadminRole.id,
            },
          },
          update: {
            access_crud: fullCrud,
          },
          create: {
            site_feature_id: feature.id,
            role_id: superadminRole.id,
            access_crud: fullCrud,
          },
        });
      }
      console.log(`  ✓ [Features] ${features.length} dashboard features and superadmin permissions linked`);

      // 4. Singleton Site Config
      await tx.site_config.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          name: STORE_NAME,
          tagline: "Simple open-source e-commerce.",
          site_url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          description: "Dynamic open-source e-commerce platform built with Next.js.",
          topbar_message: "Welcome to our store!",
          theme_config: {
            bg_color: "#09090b",
            fg_color: "#18181b",
            text_color: "#ffffff",
            accent_color: "#f59e0b",
            hover_color: "#38bdf8",
            link_color: "#f59e0b",
          },
          font_family: "Inter",
          custom_css: null,
          header_config: { layout: "standard", sticky: true },
          footer_config: { layout: "standard", show_newsletter: true },
          currency: "USD",
          currency_symbol: "$",
          email: "support@example.com",
          phone: "+1 (555) 000-0000",
          address: "123 Main St, City, Country",
          social_links: {},
          business_name: STORE_NAME,
          tax_rate: 0.0,
          tax_inclusive: false,
          tax_label: "Tax",
          require_phone: false,
          allow_order_notes: true,
          meta_info: {
            title: STORE_NAME,
            description: "Open-source e-commerce platform.",
          },
          created_by: 0,
          updated_by: 0,
        },
      });
      console.log(`  ✓ [Config] Singleton site configuration verified`);

      // 5. Storefront CMS & Legal Pages
      const pages = [
        {
          slug: "about",
          title: "About Us",
          show_in_header: true,
          show_in_footer: true,
          sort_order: 1,
          content: `<h2>Our Story</h2>\n<p>Welcome to <strong>${STORE_NAME}</strong>! We are dedicated to providing high quality products, exceptional customer experience, and seamless delivery.</p>`,
        },
        {
          slug: "contact",
          title: "Contact Us",
          show_in_header: true,
          show_in_footer: true,
          sort_order: 2,
          content: `<p>Have questions or feedback? We would love to hear from you. Reach out to our customer support team at any time!</p>`,
        },
        {
          slug: "privacy-policy",
          title: "Privacy Policy",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 3,
          content: `<h2>1. Information We Collect</h2>\n<p>We collect essential order details including your name, email, delivery address, and contact number solely for order fulfillment and customer communication.</p>\n\n<h2>2. How We Protect Your Data</h2>\n<p>Your privacy is strictly guarded. We never sell, rent, or trade customer personal information to third parties.</p>`,
        },
        {
          slug: "terms-and-conditions",
          title: "Terms and Conditions",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 4,
          content: `<h2>1. Introduction</h2>\n<p>By accessing and placing an order with <strong>${STORE_NAME}</strong>, you confirm that you are in agreement with and bound by the terms of service outlined below.</p>\n\n<h2>2. Product Orders & Pricing</h2>\n<p>We reserve the right to adjust prices, modify product descriptions, or discontinue items at any time without notice.</p>`,
        },
        {
          slug: "shipping-policy",
          title: "Shipping Policy",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 5,
          content: `<h2>1. Order Processing Times</h2>\n<p>All orders are processed within 1 to 2 business days. You will receive an automated email confirmation once your order has dispatched.</p>`,
        },
        {
          slug: "return-and-refund-policy",
          title: "Return & Refund Policy",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 6,
          content: `<h2>1. 14-Day Return Guarantee</h2>\n<p>We accept returns on eligible products within 14 days of delivery. Items must be unworn, unused, in original packaging, and with all tags attached.</p>`,
        },
        {
          slug: "payment-policy",
          title: "Payment Policy",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 7,
          content: `<h2>1. Accepted Payment Methods</h2>\n<p>We accept Cash on Delivery (COD) and major credit/debit card options for storefront purchases.</p>`,
        },
        {
          slug: "legal-disclaimer",
          title: "Legal Disclaimer",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 8,
          content: `<h2>1. General Information & Scope</h2>\n<p>The information provided by <strong>${STORE_NAME}</strong> on this website is for general informational and shopping purposes only.</p>`,
        },
        {
          slug: "order-cancellation-policy",
          title: "Order Cancellation Policy",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 9,
          content: `<h2>1. Customer Order Cancellation</h2>\n<p>You may cancel your order free of charge at any time prior to item dispatch by contacting our support team.</p>`,
        },
        {
          slug: "cookie-policy",
          title: "Cookie Policy",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 10,
          content: `<h2>1. What Are Cookies?</h2>\n<p>Cookies are small text files stored on your device when you visit our website to remember preferences and cart items.</p>`,
        },
        {
          slug: "faq",
          title: "Frequently Asked Questions",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 11,
          content: `<h2>General Questions</h2>\n<p><strong>Q: How do I place an order?</strong><br/>\nA: Browse our catalog, select your items, add them to your cart, and proceed to checkout.</p>`,
        },
        {
          slug: "copyright-notice",
          title: "Copyright Notice",
          show_in_header: false,
          show_in_footer: true,
          sort_order: 12,
          content: `<h2>1. Intellectual Property Ownership</h2>\n<p>All content on this website is the property of <strong>${STORE_NAME}</strong> and is protected by international copyright laws.</p>`,
        },
      ];

      for (const page of pages) {
        await tx.site_page.upsert({
          where: { slug: page.slug },
          update: {},
          create: {
            slug: page.slug,
            title: page.title,
            content: page.content,
            show_in_header: page.show_in_header,
            show_in_footer: page.show_in_footer,
            sort_order: page.sort_order,
            is_active: true,
            meta_info: { title: page.title },
            theme_config: {},
            custom_css: null,
            created_by: 0,
            updated_by: 0,
          },
        });
      }
      console.log(`  ✓ [Pages] ${pages.length} storefront CMS & legal pages verified`);

      // 6. Baseline Shipping Method
      const shippingCount = await tx.shipping_method.count();
      if (shippingCount === 0) {
        await tx.shipping_method.create({
          data: {
            name: "Standard Shipping",
            description: "3–5 business days",
            price: 0.0,
            free_over: null,
            estimated_days_min: 3,
            estimated_days_max: 5,
            is_active: true,
            sort_order: 1,
            created_by: 0,
            updated_by: 0,
          },
        });
        console.log("  + [Shipping] Baseline Standard Shipping created");
      } else {
        console.log(`  ✓ [Shipping] Shipping methods verified (${shippingCount} registered)`);
      }

      // 7. Payment Methods
      await tx.payment_method.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          name: "Cash on Delivery",
          description: "Pay with cash upon delivery.",
          provider: "cash_on_delivery",
          extra_charge: null,
          instructions: "Please prepare exact payment upon delivery.",
          is_active: true,
          sort_order: 1,
          created_by: 0,
          updated_by: 0,
        },
      });

      await tx.payment_method.upsert({
        where: { id: 2 },
        update: {},
        create: {
          id: 2,
          name: "Credit / Debit Card (Stripe)",
          description: "Pay securely with Credit/Debit card or digital wallets via Stripe.",
          provider: "stripe",
          extra_charge: null,
          instructions: null,
          is_active: false,
          sort_order: 2,
          created_by: 0,
          updated_by: 0,
        },
      });
      console.log("  ✓ [Payments] Payment gateways verified (Cash on Delivery, Stripe)");

      // 8. Multi-purpose Email Configurations (Default Inactive)
      const defaultEmailConfigs = [
        {
          purpose: "order_completion",
          name: "Order Completion Emails",
          from_name: STORE_NAME,
          from_email: "orders@example.com",
          is_active: false,
          time_delay_ms: 1000,
        },
        {
          purpose: "marketing",
          name: "Marketing & Campaigns",
          from_name: STORE_NAME,
          from_email: "marketing@example.com",
          is_active: false,
          time_delay_ms: 1500,
        },
        {
          purpose: "otp_verification",
          name: "OTP Verification",
          from_name: STORE_NAME,
          from_email: "verify@example.com",
          is_active: false,
          time_delay_ms: 500,
        },
        {
          purpose: "system",
          name: "System Notifications",
          from_name: STORE_NAME,
          from_email: "system@example.com",
          is_active: false,
          time_delay_ms: 1000,
        },
      ];

      for (const cfg of defaultEmailConfigs) {
        const existing = await tx.email_config.findFirst({
          where: { purpose: cfg.purpose, deleted_at: null },
        });
        if (!existing) {
          await tx.email_config.create({
            data: {
              ...cfg,
              created_by: adminUser.id,
              updated_by: adminUser.id,
            },
          });
        }
      }
      console.log(`  ✓ [Email Config] ${defaultEmailConfigs.length} multi-purpose email configurations verified`);

      // 9. Storage Options
      const defaultStorageOptions = [
        {
          key: "local",
          name: "Local Server Storage",
          driver: "fs",
          description: "Default local uploads folder on VPS/Server disk storage.",
          is_active: true,
          env_keys: ["LOCAL_UPLOADS_DIR"],
        },
        {
          key: "aws_s3",
          name: "AWS S3 Storage",
          driver: "s3",
          description: "Amazon Web Services Simple Storage Service (S3).",
          is_active: false,
          env_keys: [
            "AWS_S3_KEY",
            "AWS_S3_SECRET",
            "AWS_S3_BUCKET",
            "AWS_S3_REGION",
          ],
        },
        {
          key: "cloudflare_r2",
          name: "Cloudflare R2",
          driver: "s3",
          description: "Zero egress cost object storage powered by Cloudflare.",
          is_active: false,
          env_keys: [
            "CLOUDFLARE_R2_KEY",
            "CLOUDFLARE_R2_SECRET",
            "CLOUDFLARE_R2_BUCKET",
            "CLOUDFLARE_R2_ENDPOINT",
          ],
        },
        {
          key: "minio",
          name: "MinIO Object Storage",
          driver: "s3",
          description: "Self-hosted S3 compatible high performance object storage.",
          is_active: false,
          env_keys: ["MINIO_KEY", "MINIO_SECRET", "MINIO_BUCKET", "MINIO_ENDPOINT"],
        },
        {
          key: "google_cloud",
          name: "Google Cloud Storage",
          driver: "gcs",
          description: "Google Cloud Platform unified object storage service.",
          is_active: false,
          env_keys: ["GCS_KEY_FILE", "GCS_BUCKET"],
        },
      ];

      for (const opt of defaultStorageOptions) {
        const existing = await tx.storage_option.findUnique({
          where: { key: opt.key },
        });
        if (!existing) {
          await tx.storage_option.create({
            data: opt,
          });
        }
      }
      console.log(`  ✓ [Storage] ${defaultStorageOptions.length} storage options verified`);

      // 10. Transactional Email Templates (6 Standard Use Cases)
      const defaultTemplates = [
        {
          key: "invoice",
          name: "Default Customer Invoice & Order Confirmation",
          description:
            "Sent to customers after an order is placed, containing complete invoice details and item summary.",
          subject:
            "Invoice {{invoice_number}} for Order #{{order_number}} — {{store_name}}",
          body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice {{invoice_number}} — {{store_name}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #18181b; color: #ffffff; padding: 32px; text-align: left; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 0; font-size: 14px; color: #a1a1aa; }
    .badge { display: inline-block; padding: 4px 12px; background-color: {{status_badge_color}}; color: #ffffff; font-size: 12px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; margin-top: 12px; }
    .body { padding: 32px; }
    .meta-label { font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 600; color: #18181b; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
    th { background-color: #f4f4f5; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #52525b; text-transform: uppercase; border-bottom: 2px solid #e4e4e7; }
    .totals { width: 100%; max-width: 280px; margin-left: auto; margin-top: 16px; }
    .totals td { padding: 6px 12px; font-size: 14px; }
    .totals .grand-total td { font-size: 18px; font-weight: 700; border-top: 2px solid #18181b; padding-top: 12px; color: #18181b; }
    .footer { background-color: #f4f4f5; padding: 24px 32px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank you for your order!</h1>
      <p>Your invoice {{invoice_number}} for order #{{order_number}} is ready.</p>
      <div class="badge">{{status_badge_text}}</div>
    </div>
    <div class="body">
      <table style="width: 100%; border: none; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 0;">
            <div class="meta-label">Billed To</div>
            <div class="meta-value">{{customer_name}}</div>
            <div style="font-size: 13px; color: #52525b;">{{customer_email}}</div>
          </td>
          <td style="width: 50%; vertical-align: top; padding: 0; text-align: right;">
            <div class="meta-label">Invoice Reference</div>
            <div class="meta-value">{{invoice_number}}</div>
            <div class="meta-label">Order Number</div>
            <div class="meta-value">{{order_number}}</div>
            <div class="meta-label">Date Issued</div>
            <div style="font-size: 13px; color: #52525b;">{{issued_date}}</div>
            <div class="meta-label" style="margin-top: 8px;">Payment Method</div>
            <div style="font-size: 13px; color: #52525b;">{{payment_method}}</div>
          </td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          {{items_table}}
        </tbody>
      </table>
      <table class="totals" style="border: none;">
        <tr>
          <td style="color: #71717a;">Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">{{subtotal}}</td>
        </tr>
        {{discount_row}}
        {{tax_row}}
        <tr>
          <td style="color: #71717a;">Shipping:</td>
          <td style="text-align: right; font-weight: 600;">{{shipping_cost}}</td>
        </tr>
        <tr class="grand-total">
          <td>Total:</td>
          <td style="text-align: right;">{{total}}</td>
        </tr>
      </table>
      {{notes_section}}
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; text-align: center;">
        <p style="font-size: 14px; color: #52525b; margin-bottom: 16px;">Thank you for shopping with {{store_name}}!</p>
        <a href="{{storefront_url}}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">Visit Storefront</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>{{store_name}}</strong></p>
      <p style="margin: 0 0 4px 0;">{{store_address}}</p>
      <p style="margin: 0;">Contact: {{store_email}} | {{store_phone}}</p>
    </div>
  </div>
</body>
</html>`,
          available_variables: [
            { name: "store_name", description: "Name of your store" },
            { name: "store_email", description: "Store contact email" },
            { name: "store_phone", description: "Store contact phone" },
            { name: "store_address", description: "Store business address" },
            { name: "logo_url", description: "URL of your store logo" },
            { name: "storefront_url", description: "Base URL of your storefront website" },
            { name: "invoice_number", description: "Unique invoice reference number" },
            { name: "order_number", description: "Unique order reference number" },
            { name: "customer_name", description: "Full name of customer" },
            { name: "customer_email", description: "Email address of customer" },
            { name: "issued_date", description: "Formatted invoice date" },
            { name: "payment_method", description: "Selected payment method name" },
            { name: "status_badge_text", description: "Status text (e.g. PAID or PENDING PAYMENT)" },
            { name: "status_badge_color", description: "Badge CSS color (#16a34a or #ca8a04)" },
            { name: "items_table", description: "HTML table rows of purchased items" },
            { name: "subtotal", description: "Formatted subtotal amount with currency" },
            { name: "discount_row", description: "Formatted HTML discount row (if applicable)" },
            { name: "tax_row", description: "Formatted HTML tax row (if applicable)" },
            { name: "shipping_cost", description: "Formatted shipping cost amount with currency" },
            { name: "total", description: "Formatted total order price with currency" },
            { name: "currency_symbol", description: "Currency symbol (e.g. $)" },
            { name: "notes_section", description: "HTML section displaying customer order notes" },
            { name: "year", description: "Current year" },
          ],
        },
        {
          key: "order_notification",
          name: "Default Admin New Order Notification",
          description:
            "Sent to admin notification email address whenever a new order is received.",
          subject: "[New Order] #{{order_number}} ({{store_name}})",
          body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order Received — {{store_name}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #18181b; color: #ffffff; padding: 32px; text-align: left; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 0; font-size: 14px; color: #a1a1aa; }
    .body { padding: 32px; }
    .meta-label { font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 600; color: #18181b; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
    th { background-color: #f4f4f5; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #52525b; text-transform: uppercase; border-bottom: 2px solid #e4e4e7; }
    .totals { width: 100%; max-width: 280px; margin-left: auto; margin-top: 16px; }
    .totals td { padding: 6px 12px; font-size: 14px; }
    .totals .grand-total td { font-size: 18px; font-weight: 700; border-top: 2px solid #18181b; padding-top: 12px; color: #18181b; }
    .footer { background-color: #f4f4f5; padding: 24px 32px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Order Received & Invoice Issued</h1>
      <p>Order #{{order_number}} has been received.</p>
    </div>
    <div class="body">
      <table style="width: 100%; border: none; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 0;">
            <div class="meta-label">Customer</div>
            <div class="meta-value">{{customer_name}}</div>
            <div style="font-size: 13px; color: #52525b;">{{customer_email}}</div>
          </td>
          <td style="width: 50%; vertical-align: top; padding: 0; text-align: right;">
            <div class="meta-label">Invoice Reference</div>
            <div class="meta-value">{{invoice_number}}</div>
            <div class="meta-label">Order Number</div>
            <div class="meta-value">{{order_number}}</div>
            <div class="meta-label">Date Issued</div>
            <div style="font-size: 13px; color: #52525b;">{{issued_date}}</div>
          </td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          {{items_table}}
        </tbody>
      </table>
      <table class="totals" style="border: none;">
        <tr>
          <td style="color: #71717a;">Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">{{subtotal}}</td>
        </tr>
        {{discount_row}}
        {{tax_row}}
        <tr>
          <td style="color: #71717a;">Shipping:</td>
          <td style="text-align: right; font-weight: 600;">{{shipping_cost}}</td>
        </tr>
        <tr class="grand-total">
          <td>Total:</td>
          <td style="text-align: right;">{{total}}</td>
        </tr>
      </table>
      {{notes_section}}
    </div>
    <div class="footer">
      <p style="margin: 0;"><strong>{{store_name}} Dashboard Notification</strong></p>
    </div>
  </div>
</body>
</html>`,
          available_variables: [
            { name: "store_name", description: "Name of your store" },
            { name: "store_email", description: "Store contact email" },
            { name: "store_phone", description: "Store contact phone" },
            { name: "store_address", description: "Store business address" },
            { name: "logo_url", description: "URL of your store logo" },
            { name: "invoice_number", description: "Unique invoice reference number" },
            { name: "order_number", description: "Unique order reference number" },
            { name: "customer_name", description: "Full name of customer" },
            { name: "customer_email", description: "Email address of customer" },
            { name: "issued_date", description: "Formatted invoice date" },
            { name: "payment_method", description: "Selected payment method name" },
            { name: "items_table", description: "HTML table rows of purchased items" },
            { name: "subtotal", description: "Formatted subtotal amount with currency" },
            { name: "discount_row", description: "Formatted HTML discount row (if applicable)" },
            { name: "tax_row", description: "Formatted HTML tax row (if applicable)" },
            { name: "shipping_cost", description: "Formatted shipping cost amount with currency" },
            { name: "total", description: "Formatted total order price with currency" },
            { name: "currency_symbol", description: "Currency symbol (e.g. $)" },
            { name: "notes_section", description: "HTML section displaying customer order notes" },
            { name: "year", description: "Current year" },
          ],
        },
        {
          key: "cod_otp",
          name: "Default COD Verification OTP Code",
          description:
            "Sent to customers during Cash on Delivery checkout containing their OTP verification code.",
          subject: "{{otp_code}} is your order verification code — {{store_name}}",
          body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Verification Code — {{store_name}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { background-color: #18181b; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .body { padding: 32px 28px; text-align: center; }
    .greeting { font-size: 15px; color: #3f3f46; margin-bottom: 20px; }
    .otp-card { background-color: #fafafa; border: 2px dashed #e4e4e7; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #09090b; }
    .expiry { font-size: 13px; color: #71717a; margin-top: 12px; }
    .notice { font-size: 12px; color: #a1a1aa; line-height: 1.5; margin-top: 24px; }
    .footer { background-color: #f4f4f5; padding: 18px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{store_name}}</h1>
    </div>
    <div class="body">
      <div class="greeting">
        Hi {{customer_name}},<br/>
        Please use the verification code below to confirm your Cash on Delivery order.
      </div>
      <div class="otp-card">
        <div class="otp-code">{{otp_code}}</div>
        <div class="expiry">Expires in {{expires_minutes}} minutes</div>
      </div>
      <div class="notice">
        If you did not initiate this order, please disregard this email.<br/>
        Do not share this verification code with anyone.
      </div>
    </div>
    <div class="footer">
      &copy; {{year}} {{store_name}}. All rights reserved.
    </div>
  </div>
</body>
</html>`,
          available_variables: [
            { name: "store_name", description: "Name of your store" },
            { name: "customer_name", description: "Customer name or 'there'" },
            { name: "otp_code", description: "6-digit OTP verification code" },
            { name: "expires_minutes", description: "OTP expiration time in minutes" },
            { name: "year", description: "Current year" },
          ],
        },
        {
          key: "order_cancellation_otp",
          name: "Default Order Cancellation Verification Code",
          description:
            "Sent to customers when they request to cancel an order to verify authorization.",
          subject:
            "{{otp_code}} is your cancellation code for Order #{{order_number}} — {{store_name}}",
          body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cancel Order {{order_number}} Verification Code — {{store_name}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { background-color: #dc2626; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .body { padding: 32px 28px; text-align: center; }
    .greeting { font-size: 15px; color: #3f3f46; margin-bottom: 20px; }
    .otp-card { background-color: #fef2f2; border: 2px dashed #fca5a5; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #991b1b; }
    .expiry { font-size: 13px; color: #71717a; margin-top: 12px; }
    .notice { font-size: 12px; color: #a1a1aa; line-height: 1.5; margin-top: 24px; }
    .footer { background-color: #f4f4f5; padding: 18px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Cancellation Request</h1>
    </div>
    <div class="body">
      <div class="greeting">
        Hi {{customer_name}},<br/>
        You requested to cancel order <strong>#{{order_number}}</strong> at <strong>{{store_name}}</strong>. Please use the verification code below to authorize this cancellation.
      </div>
      <div class="otp-card">
        <div class="otp-code">{{otp_code}}</div>
        <div class="expiry">Expires in {{expires_minutes}} minutes</div>
      </div>
      <div class="notice">
        If you did not request to cancel your order, please ignore this email and your order will remain active.<br/>
        Do not share this verification code with anyone.
      </div>
    </div>
    <div class="footer">
      &copy; {{year}} {{store_name}}. All rights reserved.
    </div>
  </div>
</body>
</html>`,
          available_variables: [
            { name: "store_name", description: "Name of your store" },
            { name: "customer_name", description: "Customer name" },
            { name: "order_number", description: "Order number being cancelled" },
            { name: "otp_code", description: "6-digit cancellation OTP code" },
            { name: "expires_minutes", description: "OTP expiration time in minutes" },
            { name: "year", description: "Current year" },
          ],
        },
        {
          key: "order_cancelled_confirmation",
          name: "Default Order Cancelled Confirmation",
          description:
            "Sent to customers once an order has been successfully cancelled.",
          subject: "Order #{{order_number}} Has Been Cancelled — {{store_name}}",
          body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order #{{order_number}} Cancelled — {{store_name}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
    .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { background-color: #18181b; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .body { padding: 32px 28px; text-align: center; }
    .status-badge { display: inline-block; padding: 6px 16px; background-color: #fef2f2; color: #991b1b; font-size: 13px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; margin-bottom: 20px; }
    .message { font-size: 15px; color: #3f3f46; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; }
    .footer { background-color: #f4f4f5; padding: 18px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{store_name}}</h1>
    </div>
    <div class="body">
      <div class="status-badge">Order Cancelled</div>
      <div class="message">
        Hi {{customer_name}},<br/>
        Your order <strong>#{{order_number}}</strong> has been successfully cancelled. If any payment was collected, a refund process will be initiated shortly.
      </div>
      <a href="{{order_details_url}}" class="btn">View Order Details</a>
    </div>
    <div class="footer">
      &copy; {{year}} {{store_name}}. All rights reserved.
    </div>
  </div>
</body>
</html>`,
          available_variables: [
            { name: "store_name", description: "Name of your store" },
            { name: "customer_name", description: "Customer name" },
            { name: "order_number", description: "Order number that was cancelled" },
            { name: "order_details_url", description: "URL link for customer to view order details" },
            { name: "year", description: "Current year" },
          ],
        },
        {
          key: "newsletter_confirmation",
          name: "Default Newsletter Subscription Confirmation",
          description:
            "Sent to double opt-in subscribers with a secure token link to confirm their email address.",
          subject: "Confirm your newsletter subscription — {{store_name}}",
          body_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirm Your Subscription</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 40px 20px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 40px; text-align: center; }
    .brand { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 24px; }
    .icon-badge { display: inline-block; background-color: #27272a; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; margin-bottom: 20px; font-size: 24px; }
    .heading { font-size: 20px; font-weight: 700; color: #f4f4f5; margin-bottom: 12px; margin-top: 0; }
    .text { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 28px; }
    .btn { display: inline-block; background-color: #f4f4f5; color: #09090b; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 9999px; transition: all 0.2s; }
    .footer { margin-top: 36px; font-size: 12px; color: #71717a; border-top: 1px solid #27272a; padding-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">{{store_name}}</div>
    <div class="icon-badge">📬</div>
    <h1 class="heading">Confirm Your Newsletter Subscription</h1>
    <p class="text">
      You're almost subscribed! Please click the button below to confirm your email address (<strong>{{to_email}}</strong>) and activate your newsletter subscription.
    </p>
    <a href="{{confirmation_url}}" class="btn" target="_blank">Confirm Subscription</a>
    <p class="text" style="margin-top: 24px; font-size: 12px; color: #71717a;">
      If you didn't request this email, you can safely ignore it.
    </p>
    <div class="footer">
      &copy; {{year}} {{store_name}}. All rights reserved.
    </div>
  </div>
</body>
</html>`,
          available_variables: [
            { name: "store_name", description: "Name of your store" },
            { name: "to_email", description: "Recipient's subscriber email address" },
            { name: "confirmation_url", description: "Signed double opt-in confirmation URL button link" },
            { name: "year", description: "Current year" },
          ],
        },
      ];

      for (const tmpl of defaultTemplates) {
        const existing = await tx.email_template.findFirst({
          where: { key: tmpl.key, deleted_at: null },
        });
        if (!existing) {
          await tx.email_template.create({
            data: {
              key: tmpl.key,
              name: tmpl.name,
              description: tmpl.description,
              subject: tmpl.subject,
              body_html: tmpl.body_html,
              available_variables: tmpl.available_variables,
              is_active: true,
              is_system: true,
              created_by: adminUser.id,
              updated_by: adminUser.id,
            },
          });
        } else {
          await tx.email_template.update({
            where: { id: existing.id },
            data: {
              is_system: true,
              available_variables: tmpl.available_variables,
            },
          });
        }
      }
      console.log(`  ✓ [Templates] ${defaultTemplates.length} transactional email templates verified`);
    },
    {
      maxWait: 10000,
      timeout: 60000,
    }
  );

  console.log("\n🩺 [Doctor] Database health check & system synchronization complete: All systems healthy!\n");
}

main()
  .catch((e) => {
    console.error("❌ Doctor seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
