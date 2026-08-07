<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Guidelines & Architecture Context

This file provides critical context for AI developer agents and engineers forking or contributing to the **next-open-ecommerce** project. It outlines the core design patterns, constraints, and architecture of the initial phase.

---

## 🚀 Project Vision & Philosophy (Initial Phase)

- **Simplicity & Hostability**: A completely dynamic, open-source e-commerce platform built in Next.js. All configurations, metadata, products, categories, and email templates are fetched dynamically.
- **Login-less Storefront**: The storefront operates without customer accounts/login, offering OTP-verified order tracking and self-service cancellation.
- **Flexible Payments**: Out-of-the-box Cash on Delivery (COD) with OTP verification alongside Stripe Checkout integration with webhook handling.
- **Storage Abstraction**: Unified storage layer powered by Flydrive (`@flydrive`) supporting configurable storage drivers (local disk, cloud readiness) managed via the dashboard.
- **Non-Blocking Processing**: Leverages Next.js `after()` API to defer non-critical operations (activity logging, media cleanup) outside the response path.
- **Email Configurations & Template Engine**: Visual email template editor and SMTP configuration to send automated order confirmations, double opt-in newsletter validations, and invoices.
- **VPS Target Deployment**: Designed for standard VPS environments with optional cloud-storage drivers and local asset optimization tooling.
- **High Performance & Optimization**: Strictly optimized to minimize database queries, CPU usage, and network requests via aggressive page/component caching and granular tag-based invalidation.

---

## 📂 Project Structure & Folder Paths

### 1. Services (`/services`)
Contains direct database queries, mutation logic, and transaction wrappers.
- E.g., [services/product-services.ts](./services/product-services.ts), [services/site-services.ts](./services/site-services.ts), [services/storage-services.ts](./services/storage-services.ts), [services/activity-log-services.ts](./services/activity-log-services.ts), [services/email-template-services.ts](./services/email-template-services.ts)

### 2. Server Actions (`/actions`)
Handles client requests, validation, permission assertions, cache revalidation, and non-blocking background tasks via `after()`.
- E.g., [actions/product-actions.ts](./actions/product-actions.ts), [actions/site-actions.ts](./actions/site-actions.ts), [actions/checkout-action.ts](./actions/checkout-action.ts), [actions/storage-actions.ts](./actions/storage-actions.ts), [actions/email-template-actions.ts](./actions/email-template-actions.ts)

### 3. Routes (`/app`)
- **Admin Dashboard**: Located in `app/(dashboard)/dashboard/` (e.g. products, categories, orders, shipping, users, roles, coupons, storages, email-templates, activity-logs, site-components, newsletter, sent-emails).
- **Storefront (E-commerce)**: Located in `app/(ecommerce)/` with catch-all routing (`[...slug]`), dynamic cart drawer, checkout, order tracking, and newsletter confirmation.
- **System Routes**: Dynamic sitemap (`app/sitemap.ts`), uploads proxy (`app/uploads/[...path]/route.ts`), and Stripe webhook handler (`app/api/webhooks/stripe/route.ts`).

### 4. Shared Libraries & Utilities (`/lib`)
Common helpers, storage drivers, and validation schemas:
- [lib/permissions.ts](./lib/permissions.ts) — Caches and retrieves user permissions.
- [lib/guards.ts](./lib/guards.ts) — Asserts user permissions for route/action authorization.
- [lib/action-utils.ts](./lib/action-utils.ts) — Format validation errors and standardize Action responses.
- [lib/validations.ts](./lib/validations.ts) — Centralized Zod validation schemas.
- [lib/storefront.ts](./lib/storefront.ts) — Queries for storefront page data.
- [lib/storage/flydrive.ts](./lib/storage/flydrive.ts) — Flydrive storage abstraction driver setup.
- [lib/email-template-engine.ts](./lib/email-template-engine.ts) — Dynamic template rendering and variable replacement engine.
- [lib/captcha.ts](./lib/captcha.ts) — Verification utility for CAPTCHA anti-bot protection.
- [lib/stripe.ts](./lib/stripe.ts) — Stripe SDK initialization and session helpers.
- [lib/image-optimizer.ts](./lib/image-optimizer.ts) — Sharp-based image optimization and metadata calculation.

### 5. Modals & UI Components
- Small dashboard forms use the custom modal dialog helper in [app/(dashboard)/_components/modal.tsx](./app/\(dashboard\)/_components/modal.tsx).

---

## 🏛️ Architecture & Coding Standards

### 1. Database & Schema Design
- **Denormalized Snapshots**: To prevent heavy SQL joins on hot paths and ensure transaction history remains immutable, details such as product name, unit price, coupon codes, and shipping method name are snapshotted and stored directly on `order` and `order_item` records at checkout.
- **Transactions & Safety**: Critical database mutations use `prisma.$transaction` to guarantee consistency across multi-table operations.
- **Indexes & Mapping**: All tables are properly mapped using `@@map` and indexed using `@@index` on key columns (such as foreign keys, status flags, and slugs) to maintain high performance under PostgreSQL.

### 2. Services Layer Guidelines
- **Write/Mutation Focus Only**: Services must only handle create, update, and delete actions.
- **No READ/GET Functions**: Storefront and Admin READ/GET queries are written directly inside page/route files rather than services.
- **Common Functions**:
  1. `create[Model]InDB`: Creates a record.
  2. `update[Model]InDB`: A single update function that handles general updates **and** soft deletes (by receiving `deleted_at: Date` and `deleted_by: number` parameters).
  3. `delete[Model]PermanentlyInDB`: Deletes the record from the database.

### 3. Server Actions & Background Processing Guidelines
- **Mandatory Checks**: Every action must execute Zod validation (using `.safeParse()`) and verify user rights using `assertPermission()`.
- **Non-Blocking Tasks (`after()`)**: Use `after()` from `next/server` inside server actions for side effects that should not block the HTTP response (e.g. audit activity logging, physical media file cleanup).
- **Standardized Action Response**: Must return the `ActionResponse` interface:
  ```typescript
  export type ActionResponse = {
    success: boolean;
    errors?: Record<string, string>;
    message?: string;
  };
  ```
- **Common Action Structure**:
  - `create[Model]`: Parses validation, asserts permission, and creates record via service.
  - `update[Model]`: Parses validation, asserts permission, and updates record via service.
  - `delete[Model]`: Performs soft delete by calling the service update function with a `deleted_at` timestamp.
  - `restore[Model]`: Restores soft-deleted items by updating `deleted_at` to `null`.
  - `permanentlyDelete[Model]`: Deletes the record permanently using the service permanent delete function.

---

## ⚡ Caching & Revalidation Strategy

- **Page/Component-Level Caching (Storefront)**: We do not cache individual database queries. Instead, we use page-level and layout-level component caching (`"use cache"` and `cacheLife("max")`) on public storefront pages to prevent constant page rendering and reduce DB load.
- **Granular Tag-Based Revalidation**: Server actions trigger precise cache invalidation using `revalidateTag` with specific tags (e.g., `products`, `categories`, `site-config`, `coupons`, `sitemap`).
- **Dynamic Sitemap**: The sitemap (`app/sitemap.ts`) is dynamically rendered and revalidated on demand when products or categories change via the `sitemap` tag.
- **Role-Based Layout Caching**: Caching of dashboard routes and layouts is done dynamically using `cacheComponents: true` in `next.config.ts` to cache layouts for specific roles.

---

## 🛡️ Authentication & Authorization Rules

- **Assert Permission Guard**: Every route within the dashboard and every server action must manually call `assertPermission(action, path)` from `lib/guards.ts` to block unauthorized access.
- **NO Middleware**: Next.js middleware is **not** implemented in this project due to dependencies on database permissions lookup and component-level caching. **Do not implement middleware.**

---

## 📝 Forms, Security & CAPTCHA Strategy

- **Client-Side Validation**: All forms must implement client-side Zod validation using React Hook Form to intercept errors before triggering a server action.
- **Anti-Bot Protection**: Public forms (checkout, newsletter subscription) integrate server-verified CAPTCHA controls (Turnstile / reCAPTCHA / HCaptcha) configured in site settings.
- **Toast Notifications**: Any message returned in the `ActionResponse` (success or error) must be displayed directly as a toast message.
- **Modal vs Route**:
  - Small, quick forms (e.g. creating/editing simple records, categories) must use the modal dialog helper.
  - Large/complex forms must be mapped to distinct page routes.

---

## 🔑 Permissions & Role Configuration

Permissions are built around three core tables:
1. `site_feature`: Preseeded dashboard features and associated paths.
2. `role`: Contains role names.
3. `site_feature_role`: A junction table mapping features to roles, including an `access_crud` JSON column defining explicit permissions (`create`, `read`, `update`, `delete`).
- `superadmin`: A special system role with immutable permissions that can never be modified, downgraded, or deleted.

