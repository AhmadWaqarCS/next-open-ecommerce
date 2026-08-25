# Next Open E-Commerce

<p align="center">
  <b>A dynamic, self-hostable, high-performance open-source e-commerce platform built with Next.js 16, React 19, Prisma ORM, and PostgreSQL.</b>
</p>

---

## 🌟 About the Project

**Next Open E-Commerce** is a modern, open-source storefront and management platform engineered for speed, simplicity, and complete hostability. Designed from the ground up for standard Linux Virtual Private Servers (VPS), it eliminates reliance on expensive cloud SaaS platforms, third-party headless CMSs, and vendor lock-in.

Every element of the storefront—from site metadata, branding colors, hero taglines, product catalogs, and multi-level category hierarchies down to email templates, legal policies, and footer links—is entirely dynamic and configurable through an intuitive, permission-controlled admin dashboard.

---

## 🎯 Vision & Core Philosophy

- **Simplicity & Hostability**: Designed to run seamlessly on a low-cost VPS with zero mandatory third-party cloud SaaS dependencies.
- **Storage Abstraction Layer**: Unified storage engine powered by Flydrive (`@flydrive`) supporting flexible storage drivers (local disk, cloud bucket readiness) with dashboard management.
- **Login-less Storefront & Self-Service Portal**: Frictionless purchasing experience for customers without forced account creation, complemented by secure OTP-based email verification for order tracking and self-service cancellations.
- **Flexible Hybrid Payments**: Native Cash on Delivery (COD) support with optional email OTP verification alongside full Stripe Checkout integration and secure webhook processing.
- **Non-Blocking Background Tasks**: Utilizes Next.js 16 `after()` API (`next/server`) to offload asynchronous tasks like physical media cleanup and audit activity logging outside of response delivery.
- **Aggressive Component Caching & Granular Tag Revalidation**: Leverages Next.js 16 page/component-level caching (`"use cache"`, `cacheLife("max")`, and `cacheComponents: true`). Public storefront requests are served instantly from cache with near-zero database load, invalidating precisely via targeted revalidation tags (`products`, `categories`, `site-config`, `coupons`, `sitemap`).
- **Dynamic Email Template Engine**: Full dynamic email template builder with visual editing and customizable variable injection for order receipts, OTP delivery, newsletter double opt-in, and invoice dispatches.
- **PostgreSQL & Prisma Integration**: Strictly built for PostgreSQL using Prisma ORM with `@prisma/adapter-pg` for type-safe database queries, atomic transactions, and automated schema migrations.

---

## 🔥 Current Implemented Features

### 🛒 Customer Storefront (`/`)
- **Dynamic Catch-All Routing (`[...slug]`)**: Dynamic product and hierarchical multi-level category navigation via clean catch-all route segments.
- **Dynamic Homepage**: Managed hero banners, featured categories, promoted product grids, and customizable topbar notification messages.
- **Dynamic Product Catalog**: Browse products with instant search, multi-level category filtering, price displays, stock status alerts, and variant selectors (sizes, colors).
- **Interactive Cart & Checkout**: Slide-over cart drawer and streamlined checkout form with instant shipping method selection, coupon code validation & discount application, COD option, and Stripe Checkout integration.
- **Order Tracking & Self-Service Cancellation**: Dedicated tracking portal allowing buyers to trace order progress and request order cancellations validated securely via OTP email verification.
- **Double Opt-In Newsletter System**: Newsletter subscription flow complete with token-based email confirmation validation to build verified mailing lists.
- **CAPTCHA Anti-Bot Protection**: Server-verified CAPTCHA controls (Turnstile / reCAPTCHA / HCaptcha) safeguarding public forms against automated submission abuse.
- **Dynamic Pages & Policies**: Custom CMS pages (Privacy Policy, Refund Policy, Terms of Service, FAQs, Shipping Policy) rendered dynamically from the database with simplified status toggling.
- **Dynamic Sitemap**: Dynamically rendered, tag-revalidated sitemap (`app/sitemap.ts`) automatically updating on catalog changes.
- **SEO & Metadata**: Dynamic meta titles, open graph descriptions, primary brand colors, light/dark logos, and favicons loaded live from site configuration.

### 🛡️ Admin Dashboard (`/dashboard`)
- **Storage Drivers & Migration UI (`/dashboard/storages`)**: Configure active storage drivers (Flydrive), manage local disk upload roots, inspect storage usage, and run automated asset migration tools.
- **Email Template Manager (`/dashboard/email-templates`)**: Visual template builder to customize HTML email layouts, preview responsive email designs, and manage dynamic variable tags (`{order_id}`, `{customer_name}`, `{otp_code}`, etc.).
- **Activity Logs & Audit Trail (`/dashboard/activity-logs`)**: Administrative action logger capturing user activities, entity mutations, and operational events across the dashboard.
- **Order Management & Analytics (`/dashboard/orders`)**: Real-time order fulfillment pipeline (pending, processing, shipped, delivered, cancelled), revenue & order status visual analytics dashboard, tracking code assignment, and single-click automated PDF invoice generation & email dispatching. State guards prevent altering cancelled orders.
- **Product & Category Management (`/dashboard/products`, `/dashboard/categories`)**: Hierarchical multi-level categories, product variants, inventory tracking, low-stock threshold alerts, and soft-delete capabilities (`deleted_at`).
- **Media Library & Image Optimizer (`/dashboard/media`)**: Image optimization engine supporting batch compression/resizing, automatic calculation of file metadata (dimensions, mime type, byte size), and broken media scanner.
- **Denormalized Order Snapshots**: Order line items, product names, unit prices, coupon codes, and shipping fees are snapshotted at checkout to guarantee immutable historical transaction records.
- **Coupons & Discounts (`/dashboard/coupons`)**: Percentage and fixed discount rules with expiration dates, usage limits, and minimum spend requirements validated dynamically during checkout.
- **Shipping & Themes Registry (`/dashboard/shipping`, `/dashboard/themes`)**: Custom shipping methods with fee structures and theme registry with status-based control toggles for developer theme components and CMS pages.
- **Email Configurations & Live Tester (`/dashboard/email-config`)**: Configure custom SMTP servers, sender names, and recipient addresses directly from the dashboard with built-in live email connectivity testing.
- **Dynamic RBAC & Role Management (`/dashboard/roles`, `/dashboard/users`)**: Multi-user administrative access backed by preseeded site features (`site_feature`), custom roles (`role`), and explicit CRUD permission matrices (`access_crud` JSON). Includes an immutable `superadmin` role protected against modification or deletion.
- **Security Guards**: Comprehensive Server Action guards using `assertPermission()`, server-side Zod payload validation, non-blocking background cleanup via `after()`, and strict file path traversal guards.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19, `next/server` `after()` API)
- **Database & ORM**: PostgreSQL & Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-pg`)
- **Storage Abstraction**: Flydrive (`@flydrive/local`, `@flydrive/source`)
- **Payment Processing**: Stripe SDK (`stripe`) & Native Cash on Delivery (COD)
- **Styling**: Tailwind CSS v4
- **Forms & Validation**: React Hook Form with Zod (`@hookform/resolvers`)
- **Media Processing**: Sharp (`sharp`) for server-side image compression & optimization
- **PDF Generation**: JsPDF & AutoTable (`jspdf`, `jspdf-autotable`)
- **Email Dispatch & Templates**: Nodemailer (`nodemailer`) & custom template engine
- **Icons & UI**: Lucide React Icons & custom modular dialog components

---

## 🖥️ VPS Deployment Guide

Follow these step-by-step instructions to deploy **Next Open E-Commerce** on your Linux VPS (Ubuntu/Debian) after cloning the repository.

### 📋 Prerequisites
- **Node.js**: v20.x or v22.x LTS installed on the server.
- **PostgreSQL**: v15 or higher running locally or accessible via network.
- **Git**: Installed for repository management.
- **PM2**: Recommended process manager for Node.js (`npm install -g pm2`).

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/next-open-ecommerce.git
cd next-open-ecommerce
```

---

### Step 2: Install Project Dependencies
Install all required Node.js dependencies using `npm`:
```bash
npm install
```

---

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory:
```bash
nano .env
```

Add your production configuration variables:
```env
# PostgreSQL Database Connection String
DATABASE_URL="postgres://postgres:YOUR_DB_PASSWORD@127.0.0.1:5432/next-open-ecommerce?schema=public"

# Authentication Secrets (Generate secure random 32-byte string, e.g. using `openssl rand -hex 32`)
BETTER_AUTH_SECRET="your-generated-random-32-byte-hex-secret"
AUTH_SECRET="your-generated-random-32-byte-hex-secret"

# Host Trusting Configuration
TRUST_HOST=true

# Optional Stripe Payment Gateway Credentials
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Optional CAPTCHA Site Configuration
CAPTCHA_SECRET_KEY="your-captcha-secret-key"

# Optional Initial Seed Overrides
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="YourSecurePassword123!"
STORE_NAME="Next Open E-Commerce"
NEXT_PUBLIC_SITE_URL="https://yourstore.com"
```

---

### Step 4: Setup Database & Run Migrations

Execute the following sequence to generate the Prisma client, create database tables/indexes, and seed initial store data:

1. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Push Database Schema**:
   ```bash
   npx prisma db push
   ```
   *This initializes all PostgreSQL tables, indexes, denormalized relationships, and constraints defined in `prisma/schema.prisma`.*

3. **Seed Initial Database Content**:
   ```bash
   npx prisma db seed
   ```
   *This populates default admin permissions, site features, initial store configuration, email templates, default storage drivers, sample policies, shipping methods, Cash on Delivery options, and your default Superadmin user account.*

---

### Step 5: Build the Production Application
Compile the Next.js application for production:
```bash
npm run build
```

---

### Step 6: Create Uploads Directory & Set Permissions
Ensure the local uploads folder exists with write permissions for product image storage:
```bash
mkdir -p uploads
chmod -R 755 uploads
```

---

### Step 7: Launch Process with PM2 (Process Manager)

Start and persist the application using PM2 so it automatically restarts on server reboots or crashes:

```bash
# Start Next.js server with PM2
pm2 start npm --name "next-open-ecommerce" -- start -- -p 3000

# Save process list
pm2 save

# Setup system startup script
pm2 startup
```

---

### Step 8: Configure Nginx Reverse Proxy & SSL (Optional but Recommended)

Create an Nginx configuration block (`/etc/nginx/sites-available/yourstore.com`):

```nginx
server {
    server_name yourstore.com www.yourstore.com;

    # Increase max upload size for product images
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and obtain a free SSL certificate via Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/yourstore.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourstore.com -d www.yourstore.com
```

---

## 🔑 Default Credentials

After running `npx prisma db seed`, you can sign in to the Admin Dashboard at `/dashboard/login` using:

- **Dashboard Login URL**: `https://yourstore.com/dashboard`
- **Email**: `admin@example.com` (or value of `ADMIN_EMAIL` in `.env`)
- **Password**: `password123` (or value of `ADMIN_PASSWORD` in `.env`)

> ⚠️ **Important**: Immediately change the default admin password in `/dashboard/users` after your first login!

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).

