"use client";

import { useState } from "react";
import { CRUD } from "@/lib/types";
import UserFormModal from "./_components/user-form-modal";

interface CreateUserProps {
  roles: { id: number; name: string }[];
  permissions: CRUD;
}

export default function CreateUserForm({
  roles,
  permissions,
}: CreateUserProps) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <>
      {permissions.create && (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Add User</span>
        </button>
      )}

      <UserFormModal
        isOpen={isCreating && permissions.create}
        onClose={() => setIsCreating(false)}
        roles={roles}
      />
    </>
  );
}
