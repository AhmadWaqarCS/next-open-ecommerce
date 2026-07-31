"use client";

import { UseFormSetError } from "react-hook-form";

export function setFormErrors(
  errors: Record<string, string>,
  setError: UseFormSetError<any>,
) {
  Object.entries(errors).forEach(([field, message]: [string, string]) => {
    setError(field as string, {
      type: "server",
      message: message as string,
    });
  });
}
