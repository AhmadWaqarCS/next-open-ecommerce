"use client";

import { useState } from "react";
import { CRUD } from "@/lib/types";
import RoleFormModal from "./_components/role-form-modal";

interface CreateRoleFormProps {
  permissions: CRUD;
}

export default function CreateRoleForm({ permissions }: CreateRoleFormProps) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <>
      {permissions.create && (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover active:scale-[0.98] text-dashboard-primary-fg shadow-xs transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Role</span>
        </button>
      )}

      <RoleFormModal
        isOpen={isCreating && permissions.create}
        onClose={() => setIsCreating(false)}
      />
    </>
  );
}
