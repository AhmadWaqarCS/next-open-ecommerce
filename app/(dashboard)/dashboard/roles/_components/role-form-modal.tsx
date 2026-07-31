"use client";

import { createRole, updateRole } from "@/actions/role-actions";
import { setFormErrors } from "@/lib/client-utils";
import { roleWithPermissions } from "@/lib/types";
import {
  RoleCreateInput,
  roleCreateSchema,
  RoleUpdateInput,
  roleUpdateSchema,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import Modal from "@/app/(dashboard)/_components/modal";

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: roleWithPermissions | null;
}

export default function RoleFormModal({
  isOpen,
  onClose,
  initialData,
}: RoleFormModalProps) {
  const isEdit = Boolean(initialData);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const isSuperadminTarget = initialData?.name === "superadmin";

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<RoleCreateInput | RoleUpdateInput>({
    resolver: zodResolver(isEdit ? roleUpdateSchema : roleCreateSchema) as any,
  });

  useEffect(() => {
    if (isOpen) {
      setGlobalError(null);
      if (initialData) {
        reset({
          name: initialData.name,
          is_active: initialData.is_active,
        });
      } else {
        reset({
          name: "",
          is_active: true,
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = (data: any) => {
    setGlobalError(null);
    startTransition(async () => {
      const response = isEdit
        ? await updateRole(initialData!.id, data)
        : await createRole(data);

      if (!response.success) {
        if (response.errors) setFormErrors(response.errors, setError);
        if (response.message) setGlobalError(response.message);
        return;
      }

      onClose();
      toast(
        response.message ??
          (isEdit ? "Role updated successfully" : "Role created successfully"),
        "success",
      );
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {isEdit ? "Edit Role Settings" : "Create New Role"}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {isEdit
            ? "Rename administrative roles or activate/deactivate access levels."
            : "Establish a new role classification for the dashboard administrators."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {globalError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 font-medium"
          >
            {globalError}
          </div>
        )}

        <div>
          <label
            htmlFor="role-form-name"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5"
          >
            Role Name
          </label>
          <input
            id="role-form-name"
            disabled={isSuperadminTarget}
            type="text"
            placeholder={isEdit ? "Role name" : "e.g. Manager"}
            autoComplete="off"
            {...register("name")}
            className="w-full px-3.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.name.message as string}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 py-1">
          <input
            type="checkbox"
            id="role-form-is_active"
            disabled={isSuperadminTarget}
            {...register("is_active")}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="role-form-is_active"
            className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer disabled:opacity-50"
          >
            Role Active
          </label>
          {errors.is_active && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.is_active.message as string}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/10 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Settings"
                : "Create Role"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
