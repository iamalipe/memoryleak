import type { FieldErrors, FieldValues } from "react-hook-form"

export function getErrorByPath<T extends FieldValues>(
  errors: FieldErrors<T>,
  path: string
) {
  return path
    .split(".")
    .reduce<any>((acc, key) => (acc && acc[key] ? acc[key] : undefined), errors)
}

export function handleFormError({
  form,
  error,
  defaultMessage = "Something wrong.",
}: {
  form: any
  error: any
  defaultMessage?: string
}) {
  if (
    error?.errors &&
    Array.isArray(error?.errors) &&
    error?.errors?.length > 0
  ) {
    error?.errors.forEach((er: any) =>
      form.setError(er.path, {
        message: er?.message || defaultMessage,
      })
    )
  } else {
    form.setError("root", {
      message: error?.message || defaultMessage,
    })
  }
}
