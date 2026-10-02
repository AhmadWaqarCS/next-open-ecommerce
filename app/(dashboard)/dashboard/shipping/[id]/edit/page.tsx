import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { serializeShippingMethod } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import { notFound } from "next/navigation";
import ShippingForm from "../../_components/shipping-form";
import { getShippingEditDataInDB } from "@/services/shipping-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Shipping Method",
  description: "Edit shipping method settings and rate tiers",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditShippingPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <EditShippingPageContent {...props} />
    </Suspense>
  );
}

async function EditShippingPageContent({ params }: PageProps) {
  await assertPermission("update", "/dashboard/shipping");
  const { id } = await params;
  const methodId = Number(id);

  if (isNaN(methodId) || methodId < 1) {
    notFound();
  }

  const shippingMethodRaw = await getShippingEditDataInDB(methodId);

  if (!shippingMethodRaw) {
    notFound();
  }

  const shippingMethod = serializeShippingMethod(shippingMethodRaw);

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
      <ShippingForm initialData={shippingMethod as any} />
    </div>
  );
}
