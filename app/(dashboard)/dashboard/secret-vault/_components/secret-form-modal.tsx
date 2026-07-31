"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  secretVaultFormCreateSchema,
  secretVaultFormUpdateSchema,
  SecretVaultFormCreateInput,
} from "@/lib/validations";
import { createSecret, updateSecret } from "@/actions/secret-actions";

interface SecretFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: number;
    key_name: string;
    description: string | null;
  } | null;
}

export default function SecretFormModal({
  isOpen,
  onClose,
  initialData,
}: SecretFormModalProps) {
  const isEditing = Boolean(initialData);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(
      isEditing ? secretVaultFormUpdateSchema : secretVaultFormCreateSchema,
    ),
    defaultValues: {
      key_name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          key_name: initialData.key_name,
          description: initialData.description ?? "",
        });
      } else {
        reset({
          key_name: "",
          description: "",
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = (values: any) => {
    startTransition(async () => {
      let response;
      if (isEditing && initialData) {
        response = await updateSecret(initialData.id, {
          description: values.description,
        });
      } else {
        response = await createSecret(values as SecretVaultFormCreateInput);
      }

      if (!response.success) {
        if (response.errors) {
          Object.entries(response.errors).forEach(([field, msg]) => {
            setError(field as any, { message: String(msg) });
          });
        }
        toast(response.message ?? "Operation failed", "error");
        return;
      }

      toast(response.message ?? "Secret saved successfully", "success");
      onClose();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {isEditing ? `Edit Secret — ${initialData?.key_name}` : "Add Secret Key Entry"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isEditing
              ? "Update secret key description."
              : "Register a secret key name in the database vault."}
          </p>
        </div>

        {/* Key Name Input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Key Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            disabled={isEditing}
            placeholder="e.g. stripe_secret_key, smtp_password"
            {...register("key_name")}
            className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          />
          {errors.key_name?.message && (
            <p className="text-xs font-medium text-rose-500 mt-1">
              {String(errors.key_name.message)}
            </p>
          )}
          {!isEditing && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              Must be lowercase letters, numbers, and underscores only.
            </p>
          )}
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Description
          </label>
          <input
            type="text"
            placeholder="e.g. Live Stripe API secret key for payment processing"
            {...register("description")}
            className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
          />
          {errors.description?.message && (
            <p className="text-xs font-medium text-rose-500 mt-1">
              {String(errors.description.message)}
            </p>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Saving..." : isEditing ? "Update Description" : "Save Entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
