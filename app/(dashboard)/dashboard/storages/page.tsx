import { assertPermission } from "@/lib/guards";
import { getAllStorageOptionsFromDB } from "@/services/storage-services";
import StorageClient from "./storage-client";

export const metadata = {
  title: "Storage Options - Control Panel",
  description: "Manage system storage mediums and migration configurations.",
};

export default async function StoragePage() {
  const { user } = await assertPermission("read", "/dashboard/storages");
  const options = await getAllStorageOptionsFromDB();

  return <StorageClient options={options} userRole={user.role} />;
}
