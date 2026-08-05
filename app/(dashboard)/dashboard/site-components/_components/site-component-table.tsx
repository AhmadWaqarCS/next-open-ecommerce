"use client";

import { useState, useTransition } from "react";
import { CRUD } from "@/lib/types";
import {
  deleteSiteComponent,
  restoreSiteComponent,
  permanentlyDeleteSiteComponent,
} from "@/actions/site-component-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import SiteComponentFormModal from "./site-component-form";

interface SiteComponentItem {
  id: number;
  name: string;
  component_key: string;
  category: string;
  description: string | null;
  default_props: any;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: Date;
  deleted_at: Date | null;
}

interface SiteComponentTableProps {
  components: SiteComponentItem[];
  permissions: CRUD;
}

export default function SiteComponentTable({
  components,
  permissions,
}: SiteComponentTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] =
    useState<SiteComponentItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleCreate = () => {
    setEditingComponent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (comp: SiteComponentItem) => {
    setEditingComponent(comp);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this component?")) return;
    startTransition(async () => {
      const res = await deleteSiteComponent(id);
      if (res.success) {
        toast(res.message || "Component deleted.", "success");
      } else {
        toast(res.message || "Failed to delete component.", "error");
      }
    });
  };

  const handleRestore = (id: number) => {
    startTransition(async () => {
      const res = await restoreSiteComponent(id);
      if (res.success) {
        toast(res.message || "Component restored.", "success");
      } else {
        toast(res.message || "Failed to restore component.", "error");
      }
    });
  };

  const handlePermanentDelete = (id: number) => {
    if (!confirm("Permanently delete this component? This action cannot be undone."))
      return;
    startTransition(async () => {
      const res = await permanentlyDeleteSiteComponent(id);
      if (res.success) {
        toast(res.message || "Component permanently deleted.", "success");
      } else {
        toast(res.message || "Failed to delete component.", "error");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Site Components Catalog
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            System &amp; registered layout UI sections available for storefront dynamic page composition.
          </p>
        </div>

        {permissions.create && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Component</span>
          </button>
        )}
      </div>

      {/* Components Data Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3">Component Name</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {components.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  No site components found. Click &quot;Add Component&quot; to create one.
                </td>
              </tr>
            ) : (
              components.map((comp) => (
                <tr
                  key={comp.id}
                  className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors ${
                    comp.deleted_at ? "opacity-60 bg-red-50/10" : ""
                  }`}
                >
                  <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                    <div>{comp.name}</div>
                    {comp.description && (
                      <div className="text-xs text-zinc-400 line-clamp-1">
                        {comp.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {comp.component_key}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 capitalize">
                      {comp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {comp.deleted_at ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                        Trashed
                      </span>
                    ) : comp.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {comp.deleted_at ? (
                        <>
                          {permissions.update && (
                            <button
                              onClick={() => handleRestore(comp.id)}
                              disabled={isPending}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                            >
                              Restore
                            </button>
                          )}
                          {permissions.delete && (
                            <button
                              onClick={() => handlePermanentDelete(comp.id)}
                              disabled={isPending}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                            >
                              Delete Permanently
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {permissions.update && (
                            <button
                              onClick={() => handleEdit(comp)}
                              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                          {permissions.delete && (
                            <button
                              onClick={() => handleDelete(comp.id)}
                              disabled={isPending}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SiteComponentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingComponent}
      />
    </div>
  );
}
