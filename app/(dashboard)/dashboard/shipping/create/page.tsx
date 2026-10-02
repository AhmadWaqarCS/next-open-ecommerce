import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import ShippingForm from "../_components/shipping-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Shipping Method",
  description: "Create a new store shipping delivery method",
};

export default function CreateShippingMethodPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <CreateShippingMethodPageContent />
    </Suspense>
  );
}

async function CreateShippingMethodPageContent() {
  await assertPermission("create", "/dashboard/shipping");

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
      <ShippingForm />
    </div>
  );
}
