import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Payment Method",
};

export default async function CreatePaymentMethodPage() {
  redirect("/dashboard/payment-methods");
}
