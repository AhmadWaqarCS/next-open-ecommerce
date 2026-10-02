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

  const isSuperadminTarget = initialData?.name.toLowerCase() === "superadmin";

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
      toast.success(
        response.message ??
          (isEdit ? "Role updated successfully." : "Role created successfully."),
      );
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Top Header Section with Title & Top-Right Action Button */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-dashboard-border">
          <div>
            <h3 className="text-lg font-bold text-dashboard-fg">
              {isEdit ? "Edit Role Settings" : "Create New Role"}
            </h3>
            <p className="text-xs text-dashboard-muted mt-0.5">
              {isEdit
                ? "Rename administrative roles or activate/deactivate access levels."
                : "Establish a new role classification for the dashboard administrators."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-dashboard-border hover:bg-dashboard-card-hover text-dashboard-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Role"}
            </button>
          </div>
        </div>

        {globalError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-dashboard-danger-subtle border border-dashboard-danger text-dashboard-danger text-xs font-medium"
          >
            {globalError}
          </div>
        )}

        <div>
          <label
            htmlFor="role-form-name"
            className="block text-xs font-semibold uppercase tracking-wider text-dashboard-muted mb-1.5"
          >
            Role Name
          </label>
          <input
            id="role-form-name"
            disabled={isSuperadminTarget}
            type="text"
            placeholder={isEdit ? "Role name" : "e.g. Store Manager"}
            autoComplete="off"
            {...register("name")}
            className="w-full px-3.5 py-2 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
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
            className="h-4 w-4 rounded border-dashboard-border text-dashboard-primary focus:ring-dashboard-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="role-form-is_active"
            className="text-sm font-semibold text-dashboard-fg cursor-pointer disabled:opacity-50"
          >
            Role Active
          </label>
          {errors.is_active && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
              {errors.is_active.message as string}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
