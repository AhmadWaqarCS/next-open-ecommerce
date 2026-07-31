# Next Open E-Commerce

<p align="center">
  <b>A dynamic, self-hostable, high-performance open-source e-commerce platform built with Next.js 16, React 19, Prisma ORM, and PostgreSQL.</b>
</p>

---

## 🌟 About the Project

**Next Open E-Commerce** is a modern, open-source storefront and management platform engineered for speed, simplicity, and complete hostability. Designed from the ground up for standard Linux Virtual Private Servers (VPS), it eliminates reliance on expensive cloud SaaS platforms, third-party media storage buckets, and vendor lock-in.

Every element of the storefront—from site metadata, branding colors, hero taglines, product catalogs, and categories down to legal policies and footer links—is entirely dynamic and configurable through an intuitive, permission-controlled admin dashboard.

---

## 🎯 Vision & Core Philosophy

- **Simplicity & Hostability**: Designed to run seamlessly on a low-cost VPS with zero cloud dependencies. No external S3 storage, no third-party headless CMS, and no proprietary database services required.
- **Login-less Storefront**: Frictionless purchasing experience for customers. Buyers can browse, build a cart, and place orders directly without forcing customer registration or mandatory user account creation.
- **Cash on Delivery (COD)**: First-class Cash on Delivery support out of the box with flexible extra fee and instruction controls, alongside standard payment gateway structures.
- **Local Asset Storage & Image Proxy**: All uploaded product photos, category banners, and media assets are stored directly on the local filesystem (`uploads/`) and served securely via a built-in Next.js proxy route (`app/uploads/[...path]/route.ts`) featuring path-traversal security guards.
- **Aggressive Component Caching & Low Database Hits**: Leverages Next.js 16 page/component-level caching (`"use cache"`, `cacheLife("max")`, and `cacheComponents: true` in `next.config.ts`). Public storefront requests are served instantly from cache with near-zero database load, revalidating on-demand only when admin mutations occur.
- **PostgreSQL & Prisma Integration**: Strictly built for PostgreSQL using Prisma ORM with `@prisma/adapter-pg` for type-safe database queries and automated schema migrations.
- **Email & PDF Invoicing**: Integrated email settings supporting direct SMTP host configuration (via Nodemailer) with automated generation of PDF invoices (`jspdf` + `jspdf-autotable`) sent to customers and store administrators upon purchase.

---

## 🔥 Current Implemented Features

### 🛒 Customer Storefront (`/`)
- **Dynamic Homepage**: Managed hero banners, featured categories, promoted product grids, and customizable topbar notification messages.
- **Dynamic Product Catalog**: Browse products with search, category filtering, price displays, stock status, and variant selectors (sizes, colors).
- **Interactive Cart & Checkout**: Slide-over cart drawer and streamlined checkout form with instant shipping method selection and COD payment option.
- **Dynamic Pages & Policies**: Custom CMS pages (Privacy Policy, Refund Policy, Terms of Service, FAQs, Shipping Policy) rendered dynamically from the database.
- **SEO & Metadata**: Dynamic meta titles, open graph descriptions, primary brand colors, light/dark logos, and favicons loaded live from site configuration.

### 🛡️ Admin Dashboard (`/dashboard`)
- **Product & Category Management**: Hierarchical multi-level categories, product variants, inventory tracking, low-stock threshold alerts, and soft-delete capabilities (`deleted_at`).
- **Orders & Invoice Engine**: Real-time order fulfillment pipeline (pending, processing, shipped, delivered, cancelled), tracking code assignment, and single-click automated PDF invoice generation & email dispatching.
- **Denormalized Order Snapshots**: Order line items, product names, unit prices, coupon codes, and shipping fees are snapshotted at checkout to guarantee immutable historical transaction records.
- **Coupons & Discounts**: Percentage and fixed discount rules with expiration dates, usage limits, and minimum spend requirements.
- **Shipping & Payment Settings**: Custom shipping methods with fee structures and free-shipping minimum thresholds.
- **Media Library & Storage Scanner**: Integrated scanner that scans the physical `uploads/` folder, maps files to database records, and flags broken links or unlinked media.
- **Email Configurations & Live Tester**: Configure custom SMTP servers, sender names, and recipient addresses directly from the dashboard with built-in live email connectivity testing.
- **Dynamic RBAC & Role Management**: Multi-user administrative access backed by preseeded site features (`site_feature`), custom roles (`role`), and explicit CRUD permission matrices (`access_crud` JSON). Includes an immutable `superadmin` role protected against modification or deletion.
- **Security Guards**: Comprehensive Server Action guards using `assertPermission()`, server-side Zod payload validation, and strict file path traversal guards.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Database & ORM**: PostgreSQL & Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-pg`)
- **Styling**: Tailwind CSS v4
- **Forms & Validation**: React Hook Form with Zod (`@hookform/resolvers`)
- **PDF Generation**: JsPDF & AutoTable (`jspdf`, `jspdf-autotable`)
- **Email Dispatch**: Nodemailer (`nodemailer`)
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
   *This populates default admin permissions, site features, initial store configuration, sample policies, shipping methods, Cash on Delivery options, and your default Superadmin user account.*

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
