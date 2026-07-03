import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { AlertDialogCancel, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { zodResolver } from "@hookform/resolvers/zod"
import { forwardRef, useImperativeHandle, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

interface PromptDialogProps {
  onConfirm?: () => void
  onCancel?: () => void
  passData?: {
    defaultValue?: string
    placeholder?: string
    label?: string
    existingNames?: string[]
  }
}

export const PromptDialog = forwardRef<any, PromptDialogProps>((props, ref) => {
  const label = props.passData?.label || "Name"
  const placeholder = props.passData?.placeholder || "Enter name"
  const defaultValue = props.passData?.defaultValue || ""
  const existingNames = props.passData?.existingNames || []

  // Create zod schema with uniqueness validation
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(100, "Name is too long")
      .refine(
        (val) => !existingNames.map((n) => n.toLowerCase()).includes(val.toLowerCase()),
        { message: "A file or folder with this name already exists" }
      ),
  })

  type FormType = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    getValues,
    setFocus,
  } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultValue },
    mode: "onChange",
  })

  // Auto focus the input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFocus("name")
    }, 100)
    return () => clearTimeout(timer)
  }, [setFocus])

  // Expose values to AlertPopupProvider
  useImperativeHandle(ref, () => ({
    getValues: () => ({ value: getValues("name") }),
  }))

  const onSubmit = () => {
    if (props.onConfirm) {
      props.onConfirm()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt-name" className="text-sm font-medium">
          {label}
        </Label>
        <Input
          id="prompt-name"
          placeholder={placeholder}
          className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
          {...register("name")}
          autoComplete="off"
        />
        {errors.name && (
          <span className="text-xs text-destructive mt-0.5 animate-in fade-in-50 duration-200">
            {errors.name.message}
          </span>
        )}
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel type="button" onClick={props.onCancel}>
          Cancel
        </AlertDialogCancel>
        <Button type="submit" disabled={!isValid}>
          Submit
        </Button>
      </AlertDialogFooter>
    </form>
  )
})
