<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Guidelines & Architecture Context

This file provides critical context for AI developer agents and engineers forking or contributing to the **next-open-ecommerce** project. It outlines the core design patterns, constraints, and architecture of the initial phase.

---

## 🚀 Project Vision & Philosophy (Initial Phase)

- **Simplicity & Hostability**: A completely dynamic, open-source e-commerce platform built in Next.js. All configurations, metadata, products, and categories are fetched dynamically.
- **Login-less Storefront**: The storefront operates without customer accounts/login.
- **Cash on Delivery (COD)**: Payment is currently handled strictly via COD.
- **Email Configurations**: Managed in the dashboard to send order confirmations and invoices to customers.
- **VPS Target Deployment**: Designed for standard VPS environments, utilizing a local `uploads/` directory for asset storage (images, videos).
- **High Performance & Optimization**: Strictly optimized to minimize database queries, CPU usage, and network requests, while accepting higher memory consumption due to aggressive page/component caching.

---

## 📂 Project Structure & Folder Paths

### 1. Services (`/services`)
Contains direct database queries and database-level mutation logic.
- E.g., [services/product-services.ts](./services/product-services.ts), [services/site-services.ts](./services/site-services.ts)

### 2. Server Actions (`/actions`)
Handles client requests, validation, permission assertions, and triggers cache revalidation.
- E.g., [actions/product-actions.ts](./actions/product-actions.ts), [actions/site-actions.ts](./actions/site-actions.ts)

### 3. Routes (`/app`)
- **Admin Dashboard**: Located in `app/(dashboard)/dashboard/` (e.g. products, categories, orders, shipping, users, roles, coupons).
- **Storefront (E-commerce)**: Located in `app/(ecommerce)/` (e.g. homepage, product pages, category pages, cart drawer, checkout, and simple about/contact pages).

### 4. Shared Libraries & Utilities (`/lib`)
Common helpers and validation schemas:
- [lib/permissions.ts](./lib/permissions.ts) — Caches and retrieves user permissions.
- [lib/guards.ts](./lib/guards.ts) — Asserts user permissions for route/action authorization.
- [lib/action-utils.ts](./lib/action-utils.ts) — Format validation errors and standardize Action responses.
- [lib/validations.ts](./lib/validations.ts) — Centralized Zod validation schemas.
- [lib/storefront.ts](./lib/storefront.ts) — Queries for storefront page data.

### 5. Modals & UI Components
- Small dashboard forms use the custom modal dialog helper in [app/(dashboard)/_components/modal.tsx](./app/\(dashboard\)/_components/modal.tsx).

---

## 🏛️ Architecture & Coding Standards

### 1. Database & Schema Design
- **Denormalized Snapshots**: To prevent heavy SQL joins on hot paths and ensure transaction history remains immutable, details such as product name, unit price, coupon codes, and shipping method name are snapshotted and stored directly on `order` and `order_item` records at checkout.
- **Indexes & Mapping**: All tables are properly mapped using `@@map` and indexed using `@@index` on key columns (such as foreign keys, status flags, and slugs) to maintain high performance and scalability under PostgreSQL.

### 2. Services Layer Guidelines
- **Write/Mutation Focus Only**: Services must only handle create, update, and delete actions.
- **No READ/GET Functions**: Storefront and Admin READ/GET queries are written directly inside page/route files rather than services.
- **Common Functions**:
  1. `create[Model]InDB`: Creates a record.
  2. `update[Model]InDB`: A single update function that handles general updates **and** soft deletes (by receiving `deleted_at: Date` and `deleted_by: number` parameters).
  3. `delete[Model]PermanentlyInDB`: Deletes the record from the database.

### 3. Server Actions Guidelines
- **Mandatory Checks**: Every action must execute Zod validation (using `.safeParse()`) and verify user rights using `assertPermission()`.
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

- **Page/Component-Level Caching (Storefront)**: We do not cache individual database queries (no data-level caching). Instead, we use page-level and layout-level component caching (`"use cache"` and `cacheLife("max")`) on public storefront pages to prevent constant page rendering and reduce DB load.
- **Role-Based Layout Caching**: Caching of dashboard routes and layouts is done dynamically using `cacheComponents: true` in `next.config.ts` to cache layouts for specific roles.
- **On-Demand Revalidation**: Since `"use cache"` does not support traditional static generation (SSG) or standard ISR timers, storefront pages and layouts are revalidated on-demand.
- **Revalidation Location**: Cache revalidation (using `revalidateTag` and `revalidatePath`) must be invoked inside **Server Actions** where mutations take place. Service files should not carry cache revalidation logic.

---

## 🛡️ Authentication & Authorization Rules

- **Assert Permission Guard**: Every route within the dashboard and every server action must manually call `assertPermission(action, path)` from `lib/guards.ts` to block unauthorized access.
- **NO Middleware**: Next.js middleware is **not** implemented in this project due to dependencies on database permissions lookup and component-level caching. **Do not implement middleware.**

---

## 📝 Forms & Dialogs Strategy

- **Client-Side Validation**: All forms must implement client-side Zod validation using React Hook Form to intercept errors before triggering a server action.
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
