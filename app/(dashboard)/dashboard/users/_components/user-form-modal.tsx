"use client";

import { createUser, updateUser } from "@/actions/user-actions";
import { setFormErrors } from "@/lib/client-utils";
import { user } from "@/lib/types";
import {
  UserCreateInput,
  userCreateSchema,
  UserUpdateInput,
  userUpdateSchema,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import Modal from "@/app/(dashboard)/_components/modal";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: user | null;
  roles: { id: number; name: string }[];
  currentUser?: { id: string; email?: string | null; role: string };
}

export default function UserFormModal({
  isOpen,
  onClose,
  initialData,
  roles,
  currentUser,
}: UserFormModalProps) {
  const isEdit = Boolean(initialData);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const isSuperadminTarget = initialData?.role_name === "superadmin";

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<UserCreateInput | UserUpdateInput>({
    resolver: zodResolver(isEdit ? userUpdateSchema : userCreateSchema) as any,
  });

  useEffect(() => {
    if (isOpen) {
      setGlobalError(null);
      if (initialData) {
        reset({
          name: initialData.name || "",
          email: initialData.email,
          password: "",
          role_name: initialData.role_name,
          is_active: initialData.is_active,
        });
      } else {
        const defaultRole =
          roles.filter((r) => r.name !== "superadmin")[0]?.name ?? "";
        reset({
          name: "",
          email: "",
          password: "",
          role_name: defaultRole,
          is_active: true,
        });
      }
    }
  }, [isOpen, initialData, reset, roles]);

  const onSubmit = (data: any) => {
    setGlobalError(null);
    startTransition(async () => {
      const response = isEdit
        ? await updateUser(initialData!.id, data)
        : await createUser(data);

      if (!response.success) {
        if (response.errors) {
          setFormErrors(response.errors, setError);
        }
        if (response.message) {
          setGlobalError(response.message);
        }
        return;
      }

      onClose();
      toast(
        response.message ??
          (isEdit ? "User updated successfully" : "User created successfully"),
        "success",
      );
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Top Section with Title and Top-Right Action Button */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-dashboard-border">
          <div>
            <h3 className="text-lg font-bold text-dashboard-fg">
              {isEdit ? "Edit User Details" : "Create New User"}
            </h3>
            <p className="text-xs text-dashboard-muted mt-0.5">
              {isEdit
                ? "Update account credentials and permission roles."
                : "Add credentials and assign role permissions to the user."}
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
                  : "Create User"}
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
            htmlFor="user-form-name"
            className="block text-xs font-semibold uppercase tracking-wider text-dashboard-muted mb-1.5"
          >
            Full Name
          </label>
          <input
            id="user-form-name"
            type="text"
            placeholder={isEdit ? "Full Name" : "John Doe"}
            autoComplete="off"
            {...register("name")}
            className="w-full px-3.5 py-2 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none text-sm transition-colors"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
              {errors.name.message as string}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="user-form-email"
            className="block text-xs font-semibold uppercase tracking-wider text-dashboard-muted mb-1.5"
          >
            Email Address
          </label>
          <input
            id="user-form-email"
            type="email"
            placeholder={isEdit ? "Email" : "user@example.com"}
            autoComplete="off"
            {...register("email")}
            className="w-full px-3.5 py-2 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none text-sm transition-colors"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
              {errors.email.message as string}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="user-form-password"
            className="block text-xs font-semibold uppercase tracking-wider text-dashboard-muted mb-1.5"
          >
            {isEdit ? "Reset Password" : "Password"}
          </label>
          <input
            id="user-form-password"
            type="password"
            placeholder="••••••••"
            autoComplete={isEdit ? "new-password" : "new-password"}
            {...register("password")}
            className="w-full px-3.5 py-2 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none text-sm transition-colors"
          />
          <p className="mt-1 text-[10px] text-dashboard-muted">
            {isEdit
              ? "Leave empty to keep the current password."
              : "Provide a secure password for this user (minimum 8 characters)."}
          </p>
          {errors.password && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
              {errors.password.message as string}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="user-form-role"
            className="block text-xs font-semibold uppercase tracking-wider text-dashboard-muted mb-1.5"
          >
            {isEdit ? "Role Level" : "Role Assignment"}
          </label>
          <select
            id="user-form-role"
            disabled={isSuperadminTarget}
            {...register("role_name")}
            className="w-full px-3 py-2 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg focus:border-dashboard-primary focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSuperadminTarget ? (
              <option value="superadmin">superadmin</option>
            ) : (
              roles
                .filter((role) => role.name !== "superadmin")
                .map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))
            )}
          </select>
          {errors.role_name && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
              {errors.role_name.message as string}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 py-1">
          <input
            type="checkbox"
            id="user-form-is_active"
            disabled={isSuperadminTarget}
            {...register("is_active")}
            className="h-4 w-4 rounded border-dashboard-border text-dashboard-primary focus:ring-dashboard-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="user-form-is_active"
            className="text-sm font-semibold text-dashboard-fg cursor-pointer disabled:opacity-50"
          >
            Account Active
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
