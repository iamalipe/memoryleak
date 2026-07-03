import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getErrorByPath } from "@/lib/form"
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

interface FormSelectInputControllerProps<T extends FieldValues> {
  form: UseFormReturn<T>
  name: Path<T>
  nameSelect: Path<T>
  label?: React.ReactNode
  className?: string
  classNameLabel?: string
  classNameSelect?: string
  maxLength?: number
  options?: { label: string; value: string; className?: string }[]
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

const FormSelectInputController = <T extends FieldValues>({
  form,
  name,
  nameSelect,
  label,
  render,
  className,
  classNameLabel,
  classNameSelect,
  maxLength,
  options = [],
}: FormSelectInputControllerProps<T>) => {
  const id = useId()
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState, formState }) => {
        const selectError = getErrorByPath(
          formState.errors,
          nameSelect
        )?.message
        const mainInputError = getErrorByPath(formState.errors, name)?.message

        const combinedError = selectError || mainInputError
        const isError = !!combinedError

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
            <div className="flex rounded-md shadow-xs">
              <Controller
                control={form.control}
                name={nameSelect}
                render={({ field: selectField }) => (
                  <Select
                    onValueChange={selectField.onChange}
                    defaultValue={selectField.value}
                    value={selectField.value}
                  >
                    <SelectTrigger
                      id={`${id}-select`}
                      className={cn(
                        "w-40 rounded-e-none shadow-none focus:ring-0 focus:ring-offset-0",
                        isError && "border-destructive",
                        classNameSelect
                      )}
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className={cn([option.className])}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {/* Render the actual input component */}
              {render({
                field: field,
                fieldState,
                formState,
                isError,
                ariaDescribedby: descriptionId,
              })}
            </div>
            {shouldShowBottomSection && (
              <div className="mt-1 flex min-h-[16px] justify-between">
                {isError && (
                  <p id={errorId} className="text-xs text-destructive">
                    {String(combinedError)}
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

export default FormSelectInputController
