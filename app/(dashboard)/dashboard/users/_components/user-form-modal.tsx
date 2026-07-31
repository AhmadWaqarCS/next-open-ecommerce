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
        if (response.errors) setFormErrors(response.errors, setError);
        if (response.message) setGlobalError(response.message);
        return;
      }

      onClose();
      toast(
        response.message ??
          (isEdit ? "User updated Successfully" : "User created Successfully"),
        "success",
      );
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {isEdit ? "Edit User Details" : "Create New User"}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {isEdit
            ? "Update account credentials and permission roles."
            : "Add credentials and assign role permissions to the user."}
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
            htmlFor="user-form-name"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5"
          >
            Full Name
          </label>
          <input
            id="user-form-name"
            type="text"
            placeholder={isEdit ? "Full Name" : "John Doe"}
            autoComplete="off"
            {...register("name")}
            className="w-full px-3.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.name.message as string}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="user-form-email"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5"
          >
            Email Address
          </label>
          <input
            id="user-form-email"
            type="email"
            placeholder={isEdit ? "Email" : "user@example.com"}
            autoComplete="off"
            {...register("email")}
            className="w-full px-3.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.email.message as string}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="user-form-password"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5"
          >
            {isEdit ? "Reset Password" : "Password"}
          </label>
          <input
            id="user-form-password"
            type="password"
            placeholder="••••••••"
            autoComplete={isEdit ? "new-password" : "new-password"}
            {...register("password")}
            className="w-full px-3.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-zinc-400 text-sm"
          />
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
            {isEdit
              ? "Leave empty to keep the current password."
              : "Provide a secure password for this user."}
          </p>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500 font-medium">
              {errors.password.message as string}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="user-form-role"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5"
          >
            {isEdit ? "Role Level" : "Role Assignment"}
          </label>
          <select
            id="user-form-role"
            disabled={isSuperadminTarget}
            {...register("role_name")}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="mt-1 text-xs text-red-500 font-medium">
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
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="user-form-is_active"
            className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer disabled:opacity-50"
          >
            Account Active
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
                ? "Update Details"
                : "Create Account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
