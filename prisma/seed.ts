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

  const superadminRole = await prisma.role.upsert({
    where: { name: "superadmin" },
    update: { is_active: true },
    create: {
      name: "superadmin",
      is_active: true,
      created_by: 0,
      updated_by: 0,
    },
  });

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const adminUser = await prisma.dashboard_user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      role_id: superadminRole.id,
      role_name: "superadmin",
      is_active: true,
      updated_by: 0,
    },
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
    {
      name: "Secret Vault",
      path: "/dashboard/secret-vault",
      enabled: true,
      is_super: true,
    },
  ];

  const features = [];
  for (const f of featuresData) {
    const feature = await prisma.site_feature.upsert({
      where: { path: f.path },
      update: { name: f.name, enabled: f.enabled, is_super: f.is_super },
      create: f,
    });
    features.push(feature);
  }

  // Grant superadmin full CRUD access on all features
  const fullCrud = { create: true, read: true, update: true, delete: true };
  for (const feature of features) {
    await prisma.site_feature_role.upsert({
      where: {
        site_feature_id_role_id: {
          site_feature_id: feature.id,
          role_id: superadminRole.id,
        },
      },
      update: { access_crud: fullCrud },
      create: {
        site_feature_id: feature.id,
        role_id: superadminRole.id,
        access_crud: fullCrud,
      },
    });
  }

  console.log(
    `  ✓ Dashboard Site Features (${features.length}) & Permissions linked`,
  );

  await prisma.site_config.upsert({
    where: { id: 1 },
    update: { name: STORE_NAME },
    create: {
      id: 1,
      name: STORE_NAME,
      tagline: "Simple open-source e-commerce.",
      site_url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      description:
        "Dynamic open-source e-commerce platform built with Next.js.",
      topbar_message: "Welcome to our store!",
      home_tagline_label: "Featured Product",
      primary_color: "#09090b",
      secondary_color: "#18181b",
      accent_color: "#f59e0b",
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

  const pages = [
    {
      slug: "legal-disclaimer",
      title: "Legal Disclaimer",
      content: `<h2>1. General Information & Scope</h2>
<p>The information provided by <strong>${STORE_NAME}</strong> on this website is for general informational and shopping purposes only. All information on the site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the site.</p>

<h2>2. Product Representation & Accuracy</h2>
<p>While we attempt to render product colors, dimensions, and specifications as accurately as possible, actual product visuals may vary depending on monitor display settings, lighting, and manufacturing variations. Specifications are subject to change without prior notice.</p>

<h2>3. External Links & Third-Party Content</h2>
<p>This website may contain links to third-party websites or services that are not owned or controlled by us. We assume no responsibility or liability for the content, privacy policies, or practices of any third-party web sites.</p>

<h2>4. Limitation of Liability</h2>
<p>Under no circumstance shall <strong>${STORE_NAME}</strong> have any liability to you for any loss or damage of any kind incurred as a result of the use of the site or reliance on any information provided on the site. Your use of the site and your reliance on any information is solely at your own risk.</p>`,
    },
    {
      slug: "cookie-policy",
      title: "Cookie Policy",
      content: `<h2>1. What Are Cookies?</h2>
<p>Cookies are small text files stored on your device when you visit our website. They help us remember your preferences, keep items in your shopping bag, and analyze website traffic to deliver a smoother shopping experience.</p>

<h2>2. Types of Cookies We Use</h2>
<ul>
  <li><strong>Essential Cookies:</strong> Required for fundamental site operations such as cart persistence, session management, and checkout.</li>
  <li><strong>Performance & Analytics:</strong> Help us measure visitor interactions and identify traffic patterns to optimize speed and navigation.</li>
  <li><strong>Functional Cookies:</strong> Remember custom settings, preferred currencies, and localized store preferences.</li>
</ul>

<h2>3. Managing Cookie Preferences</h2>
<p>You can choose to disable or selectively turn off cookies in your web browser settings. However, disabling essential cookies may impact store functionality, preventing checkout or cart retrieval.</p>`,
    },
    {
      slug: "copyright-notice",
      title: "Copyright Notice",
      content: `<h2>1. Intellectual Property Ownership</h2>
<p>All content on this website—including text, graphics, logos, product photos, UI layouts, icons, digital downloads, and software code—is the property of <strong>${STORE_NAME}</strong> and is protected by international copyright laws.</p>

<h2>2. Permitted Use</h2>
<p>You are granted a limited, non-exclusive license to view, copy, and print pages from this website solely for your personal, non-commercial use in placing orders or shopping with us.</p>

<h2>3. Prohibited Use</h2>
<p>Any duplication, redistribution, republication, modification, or commercial exploitation of any site content without prior written permission from <strong>${STORE_NAME}</strong> is strictly prohibited.</p>`,
    },
    {
      slug: "shipping-policy",
      title: "Shipping Policy",
      content: `<h2>1. Order Processing Times</h2>
<p>All orders are processed within 1 to 2 business days (excluding weekends and holidays). You will receive an automated email confirmation once your order has dispatched.</p>

<h2>2. Domestic & International Rates</h2>
<p>Shipping charges for your order will be calculated and displayed at checkout. Free shipping thresholds apply automatically when cart subtotals meet specified promotion minimums.</p>

<h2>3. Cash on Delivery (COD) Shipping</h2>
<p>For orders selected with Cash on Delivery (COD), our courier agent will verify your contact number prior to dispatch. Please ensure exact cash is available at the time of delivery.</p>

<h2>4. Order Tracking</h2>
<p>When your order has shipped, you will receive an email notification containing a tracking number you can use to check its delivery status.</p>`,
    },
    {
      slug: "payment-policy",
      title: "Payment Policy",
      content: `<h2>1. Accepted Payment Methods</h2>
<p>We currently accept the following payment options for storefront purchases:</p>
<ul>
  <li><strong>Cash on Delivery (COD):</strong> Pay cash upon doorstep delivery.</li>
  <li><strong>Credit & Debit Cards:</strong> Visa, Mastercard, and major regional debit cards (processed securely via encrypted gateways).</li>
</ul>

<h2>2. Cash on Delivery Terms</h2>
<p>For Cash on Delivery payments, exact payment is requested upon arrival. Courier drivers cannot issue change for high denomination notes in certain delivery zones.</p>

<h2>3. Pricing, Taxes & Invoices</h2>
<p>All product prices are displayed in the active store currency. Applicable sales tax and shipping fees are calculated transparently during final checkout. An official invoice is emailed upon order placement.</p>`,
    },
    {
      slug: "order-cancellation-policy",
      title: "Order Cancellation Policy",
      content: `<h2>1. Customer Order Cancellation</h2>
<p>You may cancel your order free of charge at any time prior to item dispatch. To cancel an order, please contact our support team immediately with your Order Number.</p>

<h2>2. Cancellation After Dispatch</h2>
<p>If your order has already been handed over to our shipping courier, it cannot be cancelled in transit. Once delivered, you may initiate a return under our Return & Refund Policy.</p>

<h2>3. Store-Initiated Cancellations</h2>
<p>We reserve the right to cancel orders due to stock unavailabilities, pricing discrepancies, unverified address details, or flagged fraudulent transactions. Any charged amounts will be fully refunded immediately.</p>`,
    },
    {
      slug: "terms-and-conditions",
      title: "Terms and Conditions",
      content: `<h2>1. Introduction</h2>
<p>By accessing and placing an order with <strong>${STORE_NAME}</strong>, you confirm that you are in agreement with and bound by the terms of service outlined below.</p>

<h2>2. Product Orders & Pricing</h2>
<p>We reserve the right to adjust prices, modify product descriptions, or discontinue items at any time without notice. We reserve the right to refuse any order placed with us.</p>

<h2>3. User Responsibilities</h2>
<p>You agree to provide current, complete, and accurate purchase and account information for all orders placed at our store.</p>

<h2>4. Governing Law</h2>
<p>These terms and conditions are governed by and construed in accordance with standard commercial regulations and laws.</p>`,
    },
    {
      slug: "terms",
      title: "Terms of Service",
      content: `<h2>1. Agreement to Terms</h2>
<p>These Terms of Service apply to all users of the site. By visiting or buying from <strong>${STORE_NAME}</strong>, you engage in our service and agree to be bound by these terms.</p>
<h2>2. Accuracy of Billing Information</h2>
<p>You agree to provide true, accurate, and current information when placing orders. Inaccurate information may lead to shipping delays or order cancellations.</p>`,
    },
    {
      slug: "return-and-refund-policy",
      title: "Return and Refund Policy",
      content: `<h2>1. 14-Day Return Guarantee</h2>
<p>We accept returns on eligible products within 14 days of delivery. Items must be unworn, unused, in original packaging, and with all tags attached.</p>

<h2>2. Non-Returnable Items</h2>
<p>Perishable goods, customized products, personal care items, and final clearance items cannot be returned unless damaged or defective upon arrival.</p>

<h2>3. Refund Processing</h2>
<p>Once your returned package is received and inspected, we will notify you of the approval or rejection of your refund. Approved refunds will be processed to your original payment method or issued as store credit within 5-7 business days.</p>`,
    },
    {
      slug: "return-policy",
      title: "Return Policy",
      content: `<h2>1. Return Guidelines</h2>
<p>Products can be returned within 14 days of receipt. Please contact customer support to receive a return authorization before shipping items back.</p>`,
    },
    {
      slug: "faq",
      title: "Frequently Asked Questions",
      content: `<h2>General Questions</h2>
<p><strong>Q: How do I place an order?</strong><br/>
A: Browse our catalog, select your items, add them to your cart, and proceed to checkout. No user registration is required!</p>

<p><strong>Q: Do you offer Cash on Delivery (COD)?</strong><br/>
A: Yes! We support Cash on Delivery. You can pay cash when your order reaches your delivery address.</p>

<h2>Shipping & Delivery</h2>
<p><strong>Q: How long does delivery take?</strong><br/>
A: Standard domestic shipping typically takes 3 to 5 business days.</p>

<p><strong>Q: How do I track my shipment?</strong><br/>
A: Once dispatched, a tracking code and link will be emailed to your order email address.</p>`,
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      content: `<h2>1. Information We Collect</h2>
<p>We collect essential order details including your name, email, delivery address, and contact number solely for order fulfillment and customer communication.</p>

<h2>2. How We Protect Your Data</h2>
<p>Your privacy is strictly guarded. We never sell, rent, or trade customer personal information to third parties.</p>`,
    },
    {
      slug: "privacy",
      title: "Privacy Statement",
      content: `<h2>Privacy Protection</h2>
<p>We respect your privacy and process personal data in compliance with data privacy regulations. Information collected at checkout is strictly used for shipment and invoice delivery.</p>`,
    },
    {
      slug: "about",
      title: "About Us",
      content: `<h2>Our Story</h2>
<p>Welcome to <strong>${STORE_NAME}</strong>! We are dedicated to providing high quality products, exceptional customer experience, and seamless delivery.</p>`,
    },
    {
      slug: "contact",
      title: "Contact Us",
      content: `<p>Have questions or feedback? We would love to hear from you. Reach out to our customer support team at any time!</p>`,
    },
  ];

  for (const page of pages) {
    await prisma.site_page.upsert({
      where: { slug: page.slug },
      update: { title: page.title, content: page.content },
      create: {
        slug: page.slug,
        title: page.title,
        content: page.content,
        is_active: true,
        meta_info: { title: page.title },
        created_by: 0,
        updated_by: 0,
      },
    });
  }

  console.log(`  ✓ Storefront Pages (${pages.length}) created`);

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

  const existingCOD = await prisma.payment_method.findFirst({
    where: { provider: "cash_on_delivery" },
  });

  if (!existingCOD) {
    await prisma.payment_method.create({
      data: {
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
  }

  console.log("  ✓ Payment Method: Cash on Delivery");

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
        smtp_host: "smtp.mailtrap.io",
        smtp_port: 2525,
        smtp_secure: false,
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
