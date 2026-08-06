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
  console.log("🌱 Seeding database for next-open-ecommerce…");

  // 1. Superadmin Role
  const superadminRole = await prisma.role.upsert({
    where: { name: "superadmin" },
    update: {},
    create: {
      name: "superadmin",
      is_active: true,
      created_by: 0,
      updated_by: 0,
    },
  });

  // 2. Admin User
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const adminUser = await prisma.dashboard_user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
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
  console.log(`  ✓ Superadmin Account: ${adminUser.email}`);

  // 3. Dashboard Features & Permissions
  await prisma.site_feature.deleteMany({
    where: {
      path: { in: ["/dashboard/secrets-vault", "/dashboard/secrets"] },
    },
  });

  const featuresData = [
    { name: "Dashboard", path: "/dashboard", enabled: true, is_super: false },
    {
      name: "Orders",
      path: "/dashboard/orders",
      enabled: true,
      is_super: false,
    },
    {
      name: "Products",
      path: "/dashboard/products",
      enabled: true,
      is_super: false,
    },
    {
      name: "Categories",
      path: "/dashboard/categories",
      enabled: true,
      is_super: false,
    },
    {
      name: "Coupons",
      path: "/dashboard/coupons",
      enabled: true,
      is_super: false,
    },
    {
      name: "Shipping",
      path: "/dashboard/shipping",
      enabled: true,
      is_super: false,
    },
    {
      name: "Payment Methods",
      path: "/dashboard/payment-methods",
      enabled: true,
      is_super: false,
    },
    { name: "Pages", path: "/dashboard/pages", enabled: true, is_super: false },
    {
      name: "Site Components",
      path: "/dashboard/site-components",
      enabled: true,
      is_super: false,
    },
    {
      name: "Invoices",
      path: "/dashboard/invoices",
      enabled: true,
      is_super: false,
    },
    {
      name: "Sent Emails",
      path: "/dashboard/sent-emails",
      enabled: true,
      is_super: false,
    },
    {
      name: "Email Config",
      path: "/dashboard/email-config",
      enabled: true,
      is_super: false,
    },
    {
      name: "Newsletter",
      path: "/dashboard/newsletter",
      enabled: true,
      is_super: false,
    },
    {
      name: "Settings",
      path: "/dashboard/settings",
      enabled: true,
      is_super: false,
    },
    { name: "Media", path: "/dashboard/media", enabled: true, is_super: false },
    { name: "Roles", path: "/dashboard/roles", enabled: true, is_super: true },
    { name: "Users", path: "/dashboard/users", enabled: true, is_super: true },
  ];

  const features = [];
  for (const f of featuresData) {
    const feature = await prisma.site_feature.upsert({
      where: { path: f.path },
      update: {},
      create: f,
    });
    features.push(feature);
  }

  const fullCrud = { create: true, read: true, update: true, delete: true };
  for (const feature of features) {
    await prisma.site_feature_role.upsert({
      where: {
        site_feature_id_role_id: {
          site_feature_id: feature.id,
          role_id: superadminRole.id,
        },
      },
      update: {},
      create: {
        site_feature_id: feature.id,
        role_id: superadminRole.id,
        access_crud: fullCrud,
      },
    });
  }
  console.log(
    `  ✓ Dashboard Features (${features.length}) & Permissions linked`,
  );

  // 4. Singleton Site Config
  await prisma.site_config.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: STORE_NAME,
      tagline: "Simple open-source e-commerce.",
      site_url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      description:
        "Dynamic open-source e-commerce platform built with Next.js.",
      topbar_message: "Welcome to our store!",
      primary_color: "#09090b",
      secondary_color: "#18181b",
      accent_color: "#f59e0b",
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
  console.log("  ✓ Minimal Site Config created");

  // 5. System Registered Components Catalog
  const components = [
    {
      component_key: "hero_banner",
      name: "Hero Banner",
      category: "hero",
      description: "Hero header banner with taglines and category links.",
      default_props: {},
    },
    {
      component_key: "featured_products",
      name: "Featured Products",
      category: "products",
      description: "Grid of featured storefront products.",
      default_props: { limit: 4 },
    },
    {
      component_key: "category_grid",
      name: "Category Grid",
      category: "products",
      description: "Visual grid of product categories.",
      default_props: {},
    },
    {
      component_key: "newsletter_section",
      name: "Newsletter Section",
      category: "marketing",
      description: "Newsletter subscription form section.",
      default_props: {},
    },
    {
      component_key: "rich_text",
      name: "Rich Text Content",
      category: "content",
      description: "Custom HTML / Markdown content block.",
      default_props: {},
    },
  ];

  for (const c of components) {
    await prisma.site_component.upsert({
      where: { component_key: c.component_key },
      update: {},
      create: {
        ...c,
        is_active: true,
        created_by: 0,
        updated_by: 0,
      },
    });
  }
  console.log(`  ✓ System Components Catalog (${components.length}) seeded`);

  // 6. Active Storefront Pages (Matching existing app/(ecommerce) routes)
  const pages = [
    {
      slug: "/",
      title: "Home",
      content: null,
      show_in_header: false,
      show_in_footer: false,
      sort_order: 0,
      components_config: [
        { component_key: "hero_banner", enabled: true, sort_order: 1 },
        { component_key: "featured_products", enabled: true, sort_order: 2 },
      ],
    },
    {
      slug: "about",
      title: "About Us",
      show_in_header: true,
      show_in_footer: true,
      sort_order: 1,
      content: `<h2>Our Story</h2>
<p>Welcome to <strong>${STORE_NAME}</strong>! We are dedicated to providing high quality products, exceptional customer experience, and seamless delivery.</p>`,
      components_config: [],
    },
    {
      slug: "contact",
      title: "Contact Us",
      show_in_header: true,
      show_in_footer: true,
      sort_order: 2,
      content: `<p>Have questions or feedback? We would love to hear from you. Reach out to our customer support team at any time!</p>`,
      components_config: [],
    },
    {
      slug: "category",
      title: "All Categories",
      show_in_header: false,
      show_in_footer: false,
      sort_order: 3,
      content: null,
      components_config: [],
    },
    {
      slug: "product",
      title: "All Products",
      show_in_header: false,
      show_in_footer: false,
      sort_order: 4,
      content: null,
      components_config: [],
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 10,
      content: `<h2>1. Information We Collect</h2>
<p>We collect essential order details including your name, email, delivery address, and contact number solely for order fulfillment and customer communication.</p>

<h2>2. How We Protect Your Data</h2>
<p>Your privacy is strictly guarded. We never sell, rent, or trade customer personal information to third parties.</p>`,
      components_config: [],
    },
    {
      slug: "terms-and-conditions",
      title: "Terms and Conditions",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 11,
      content: `<h2>1. Introduction</h2>
<p>By accessing and placing an order with <strong>${STORE_NAME}</strong>, you confirm that you are in agreement with and bound by the terms of service outlined below.</p>

<h2>2. Product Orders & Pricing</h2>
<p>We reserve the right to adjust prices, modify product descriptions, or discontinue items at any time without notice.</p>`,
      components_config: [],
    },
    {
      slug: "shipping-policy",
      title: "Shipping Policy",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 12,
      content: `<h2>1. Order Processing Times</h2>
<p>All orders are processed within 1 to 2 business days. You will receive an automated email confirmation once your order has dispatched.</p>`,
      components_config: [],
    },
    {
      slug: "return-and-refund-policy",
      title: "Return & Refund Policy",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 13,
      content: `<h2>1. 14-Day Return Guarantee</h2>
<p>We accept returns on eligible products within 14 days of delivery. Items must be unworn, unused, in original packaging, and with all tags attached.</p>`,
      components_config: [],
    },
    {
      slug: "payment-policy",
      title: "Payment Policy",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 14,
      content: `<h2>1. Accepted Payment Methods</h2>
<p>We accept Cash on Delivery (COD) and major credit/debit card options for storefront purchases.</p>`,
      components_config: [],
    },
    {
      slug: "legal-disclaimer",
      title: "Legal Disclaimer",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 15,
      content: `<h2>1. General Information & Scope</h2>
<p>The information provided by <strong>${STORE_NAME}</strong> on this website is for general informational and shopping purposes only.</p>`,
      components_config: [],
    },
    {
      slug: "order-cancellation-policy",
      title: "Order Cancellation Policy",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 16,
      content: `<h2>1. Customer Order Cancellation</h2>
<p>You may cancel your order free of charge at any time prior to item dispatch by contacting our support team.</p>`,
      components_config: [],
    },
    {
      slug: "cookie-policy",
      title: "Cookie Policy",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 17,
      content: `<h2>1. What Are Cookies?</h2>
<p>Cookies are small text files stored on your device when you visit our website to remember preferences and cart items.</p>`,
      components_config: [],
    },
    {
      slug: "faq",
      title: "Frequently Asked Questions",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 18,
      content: `<h2>General Questions</h2>
<p><strong>Q: How do I place an order?</strong><br/>
A: Browse our catalog, select your items, add them to your cart, and proceed to checkout.</p>`,
      components_config: [],
    },
    {
      slug: "copyright-notice",
      title: "Copyright Notice",
      show_in_header: false,
      show_in_footer: true,
      sort_order: 19,
      content: `<h2>1. Intellectual Property Ownership</h2>
<p>All content on this website is the property of <strong>${STORE_NAME}</strong> and is protected by international copyright laws.</p>`,
      components_config: [],
    },
  ];

  for (const page of pages) {
    await prisma.site_page.upsert({
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
        components_config: page.components_config,
        created_by: 0,
        updated_by: 0,
      },
    });
  }
  console.log(`  ✓ Active Storefront Pages (${pages.length}) seeded`);

  // 7. Shipping Method
  const existingShipping = await prisma.shipping_method.findFirst({
    where: { name: "Standard Shipping" },
  });
  if (!existingShipping) {
    await prisma.shipping_method.create({
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
  }
  console.log("  ✓ Minimal Shipping Method created");

  // 8. Payment Method
  await prisma.payment_method.upsert({
    where: { id: 1 },
    update: { is_active: false },
    create: {
      id: 1,
      name: "Cash on Delivery",
      description: "Pay with cash upon delivery.",
      provider: "cash_on_delivery",
      extra_charge: null,
      instructions: "Please prepare exact payment upon delivery.",
      is_active: false,
      sort_order: 1,
      created_by: 0,
      updated_by: 0,
    },
  });
  console.log("  ✓ Payment Method: Cash on Delivery");

  await prisma.payment_method.upsert({
    where: { id: 2 },
    update: { is_active: false },
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
  console.log("  ✓ Payment Method: Credit / Debit Card (Stripe)");

  // 9. Email Config
  const existingEmail = await prisma.email_config.findFirst({
    where: { id: 1 },
  });
  if (!existingEmail) {
    await prisma.email_config.create({
      data: {
        id: 1,
        provider: "smtp",
        from_name: STORE_NAME,
        from_email: "orders@example.com",
        reply_to_email: "support@example.com",
        send_order_confirmation: true,
        send_shipping_update: true,
        send_admin_new_order: true,
        admin_notification_email: ADMIN_EMAIL,
        include_pdf_invoice: false,
        is_active: true,
        created_by: 0,
        updated_by: 0,
      },
    });
  }
  console.log("  ✓ Email Config created");

  // 10. Sample Category & Product
  const category = await prisma.category.upsert({
    where: { slug: "general" },
    update: {},
    create: {
      name: "General",
      slug: "general",
      description: "Default product category.",
      image_url:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
      bg_color: "from-zinc-800 to-zinc-950",
      show_in_header: true,
      show_in_footer: true,
      show_in_home: true,
      product_count: 1,
      sort_order: 1,
      is_active: true,
      created_by: 0,
      updated_by: 0,
    },
  });

  const productSlug = "sample-product";
  const existingProduct = await prisma.product.findUnique({
    where: { slug: productSlug },
  });
  if (!existingProduct) {
    await prisma.product.create({
      data: {
        name: "Sample Product",
        slug: productSlug,
        short_description: "A simple sample product to get started.",
        description: "This is a sample product seeded during initial setup.",
        price: 29.99,
        stock_quantity: 50,
        category_id: category.id,
        category_name: category.name,
        feature_image_url:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
        feature_image_alt_text: "Sample Product",
        is_featured: true,
        is_active: true,
        sort_order: 1,
        meta_info: {
          title: "Sample Product",
          description: "A simple sample product.",
        },
        created_by: 0,
        updated_by: 0,
        images: {
          create: [
            {
              url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
              alt_text: "Sample Product Front",
              sort_order: 0,
              created_by: 0,
              updated_by: 0,
            },
          ],
        },
        variants: {
          create: [
            {
              name: "Standard",
              price: 29.99,
              stock_quantity: 50,
              options: { size: "Standard" },
              sort_order: 0,
              created_by: 0,
              updated_by: 0,
            },
          ],
        },
      },
    });
  }

  console.log("  ✓ 1 Category & 1 Sample Product seeded");
  console.log("\n✅ Minimal Database Seeding Complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
