import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useId } from "react"
import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldValues,
  Path,
  UseFormReturn,
  UseFormStateReturn,
} from "react-hook-form"
import { Controller } from "react-hook-form"

interface FormControllerProps<T extends FieldValues> {
  form: UseFormReturn<T>
  name: Path<T>
  label?: React.ReactNode
  className?: string
  classNameLabel?: string
  maxLength?: number
  render: ({
    field,
    fieldState,
    formState,
    isError,
    ariaDescribedby,
  }: {
    field: ControllerRenderProps<T, Path<T>>
    fieldState: ControllerFieldState
    formState: UseFormStateReturn<T>
    isError: boolean
    ariaDescribedby: string | undefined
  }) => React.ReactElement
}

const FormController = <T extends FieldValues>({
  form,
  name,
  label,
  render,
  className,
  classNameLabel,
  maxLength,
}: FormControllerProps<T>) => {
  const id = useId()
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState, formState }) => {
        const error = fieldState.error
        const isError = !!error

        const errorId = isError ? `${id}-error` : undefined
        const descriptionId = errorId

        const valueLength = String(field.value ?? "").length
        const shouldShowBottomSection = isError || maxLength

        return (
          <div className={cn(["flex flex-1 flex-col", className])}>
            {label && (
              <Label
                htmlFor={id}
                className={cn(["mb-2 text-left", classNameLabel])}
              >
                {label}
              </Label>
            )}

            {/* Render the actual input component */}
            {render({
              field,
              fieldState,
              formState,
              isError,
              ariaDescribedby: descriptionId,
            })}
            {shouldShowBottomSection && (
              <div className="mt-1 flex min-h-[16px] justify-between">
                {isError && (
                  <p id={errorId} className="text-xs text-destructive">
                    {String(error.message)}
                  </p>
                )}
                {maxLength && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {valueLength}/{maxLength}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}

export default FormController
