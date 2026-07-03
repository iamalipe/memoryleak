import alertPopup from "@/alert-popup/alert-popup"
import FormController from "@/components/form/form-controller"
import {
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { forwardRef, useImperativeHandle, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

/**
 * Props passed down to custom alert components by `alert-popup-provider.tsx`
 * during cloning. Custom components can trigger these callbacks on button clicks
 * to confirm or cancel the programmatic promise.
 */
interface CustomAlertFieldsProps {
  onConfirm?: () => void
  onCancel?: () => void
  passData?: any
}

/**
 * Example 1: Simple Custom Fields Component.
 * Uses local state and exposes a `getValues()` method to the parent Provider via `useImperativeHandle`.
 * When the user clicks the default "Confirm" button (rendered by the provider),
 * the provider calls `ref.current.getValues()` to retrieve this local state data.
 */
const CustomAlertFields = forwardRef<any, CustomAlertFieldsProps>(
  (_props, ref) => {
    const [input, setInput] = useState("")
    const [input2, setInput2] = useState("")

    // Expose internal form values to the AlertPopupProvider
    useImperativeHandle(ref, () => ({
      getValues: () => ({ input, input2 }),
    }))

    return (
      <div className="flex flex-col gap-2">
        <Label className="mb-2 block">Reason for this action</Label>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Custom Input Field"
        />
        <Label className="mb-2 block">Extra info</Label>
        <Input
          value={input2}
          onChange={(e) => setInput2(e.target.value)}
          placeholder="Another field"
        />
      </div>
    )
  }
)

// Validation schema for complex forms
const formSchema = z.object({
  input: z.string().min(2, "Reason must be at least 2 characters").max(255),
  input2: z.string().min(2, "Extra info must be at least 2 characters"),
})
type FormSchemaType = z.infer<typeof formSchema>

/**
 * Example 2: Custom Fields Component with React Hook Form, Zod Validation, and Custom Footer.
 *
 * 1. Wraps layout in `<form onSubmit={form.handleSubmit(onSubmit)}>` to trigger validation.
 * 2. Uses `customFooter: true` (passed to `alertPopup.show`) to suppress the provider's default buttons.
 * 3. Renders its own `AlertDialogFooter` containing custom buttons.
 * 4. Submit button calls form submission, which executes `onSubmit`, calling `props.onConfirm()` to resolve the promise.
 * 5. Cancel button hooks into `props.onCancel()` to reject/cancel the promise.
 */
const CustomAlertFieldsWithValidation = forwardRef<any, CustomAlertFieldsProps>(
  (props, ref) => {
    const defaultValues: FormSchemaType = {
      input: "",
      input2: "",
    }

    const form = useForm<FormSchemaType>({
      resolver: zodResolver(formSchema),
      defaultValues: defaultValues,
      mode: "onChange",
    })

    // Handler run after fields pass client-side schema validation
    const onSubmit = async (values: FormSchemaType) => {
      try {
        console.log("values", values)
        // Inform the provider that validation succeeded and resolve the alert promise
        if (props.onConfirm) {
          props.onConfirm()
        }
      } catch (err: any) {
        console.log(err)
      }
    }

    // Expose form values to the provider so they return in the resolved promise data object
    useImperativeHandle(ref, () => ({
      getValues: () => ({ ...form.getValues() }),
    }))

    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-2">
          <FormController
            form={form}
            name="input"
            label="Reason for this action"
            render={({ field, isError, ariaDescribedby }) => (
              <Input
                id={field.name}
                type="text"
                data-testid="name-input"
                value={field.value as string}
                name="name"
                placeholder="Enter name"
                className={cn([isError ? "border-destructive" : ""])}
                onChange={(e) => {
                  field.onChange(e.target.value)
                }}
                aria-invalid={isError}
                aria-describedby={ariaDescribedby}
              />
            )}
          />
          <FormController
            form={form}
            name="input2"
            label="Extra info"
            render={({ field, isError, ariaDescribedby }) => (
              <Input
                id={field.name}
                type="text"
                data-testid="name-input"
                value={field.value as string}
                name="name"
                placeholder="Enter name"
                className={cn([isError ? "border-destructive" : ""])}
                onChange={(e) => {
                  field.onChange(e.target.value)
                }}
                aria-invalid={isError}
                aria-describedby={ariaDescribedby}
              />
            )}
          />
        </div>

        {/* Custom Actions block replaces default AlertDialogFooter buttons */}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" onClick={props.onCancel}>
            Cancel
          </AlertDialogCancel>
          <Button type="submit" disabled={!form.formState.isValid}>
            Submit
          </Button>
        </AlertDialogFooter>
      </form>
    )
  }
)

const CustomAlertFieldsWithValidationWithPassData = forwardRef<
  any,
  CustomAlertFieldsProps
>((props, ref) => {
  const defaultValues: FormSchemaType = {
    input: props.passData?.input || "",
    input2: props.passData?.input2 || "",
  }

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
    mode: "onChange",
  })

  // Handler run after fields pass client-side schema validation
  const onSubmit = async (values: FormSchemaType) => {
    try {
      console.log("values", values)
      // Inform the provider that validation succeeded and resolve the alert promise
      if (props.onConfirm) {
        props.onConfirm()
      }
    } catch (err: any) {
      console.log(err)
    }
  }

  // Expose form values to the provider so they return in the resolved promise data object
  useImperativeHandle(ref, () => ({
    getValues: () => ({ ...props.passData, ...form.getValues() }),
  }))

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-col gap-2">
        <FormController
          form={form}
          name="input"
          label="Reason for this action"
          render={({ field, isError, ariaDescribedby }) => (
            <Input
              id={field.name}
              type="text"
              data-testid="name-input"
              value={field.value as string}
              name="name"
              placeholder="Enter name"
              className={cn([isError ? "border-destructive" : ""])}
              onChange={(e) => {
                field.onChange(e.target.value)
              }}
              aria-invalid={isError}
              aria-describedby={ariaDescribedby}
            />
          )}
        />
        <FormController
          form={form}
          name="input2"
          label="Extra info"
          render={({ field, isError, ariaDescribedby }) => (
            <Input
              id={field.name}
              type="text"
              data-testid="name-input"
              value={field.value as string}
              name="name"
              placeholder="Enter name"
              className={cn([isError ? "border-destructive" : ""])}
              onChange={(e) => {
                field.onChange(e.target.value)
              }}
              aria-invalid={isError}
              aria-describedby={ariaDescribedby}
            />
          )}
        />
      </div>

      {/* Custom Actions block replaces default AlertDialogFooter buttons */}
      <AlertDialogFooter>
        <AlertDialogCancel type="button" onClick={props.onCancel}>
          Cancel
        </AlertDialogCancel>
        <Button type="submit" disabled={!form.formState.isValid}>
          Submit
        </Button>
      </AlertDialogFooter>
    </form>
  )
})

/**
 * Test Harness Component containing buttons to demonstrate and verify
 * all four common use cases for the programmatic alert dialog framework.
 */
export default function AlertTestingComponent() {
  // 1. Standard Yes/No confirmation dialog
  const onAlertTest = async () => {
    const res = await alertPopup.show({
      title: "Test Alert",
      description: "This is a test alert message.",
      okText: "OK",
      cancelText: "Cancel",
    })
    console.log("res", res)
    setTimeout(() => {
      alert(JSON.stringify(res))
    }, 1000)
  }

  // 2. Destructive delete confirmation dialog
  const onAlertDelete = async () => {
    const res = await alertPopup.delete()
    console.log("res", res)
    setTimeout(() => {
      alert(JSON.stringify(res))
    }, 1000)
  }

  // 3. Prompt containing custom input fields with default footer buttons
  const onAlertInfo = async () => {
    const res = await alertPopup.show({
      title: "Custom Element Test Alert",
      description: "This is a test alert message.",
      okText: "OK",
      cancelText: "Cancel",
      customElement: <CustomAlertFields />,
    })
    console.log("res", res)
    setTimeout(() => {
      alert(JSON.stringify(res))
    }, 1000)
  }

  // 4. Form dialogue requiring validation and custom footer actions
  const onAlertInfoWithValidation = async () => {
    const res = await alertPopup.show({
      title: "Custom Element With Validation Test Alert",
      description: "This is a test With Validation alert message.",
      okText: "OK",
      cancelText: "Cancel",
      customElement: <CustomAlertFieldsWithValidation />,
      customFooter: true, // Tell the provider to skip default buttons and let component handle actions
    })
    console.log("res", res)
    setTimeout(() => {
      alert(JSON.stringify(res))
    }, 1000)
  }
  const onAlertInfoWithValidationPassData = async () => {
    const customData = {
      input: "Hello World",
      input2: "Super Cool",
    }
    const res = await alertPopup.show({
      title: "Custom Element With Validation Test Alert",
      description: "This is a test With Validation alert message.",
      okText: "OK",
      cancelText: "Cancel",
      customElement: <CustomAlertFieldsWithValidationWithPassData />,
      customFooter: true, // Tell the provider to skip default buttons and let component handle actions
      passData: customData,
    })
    console.log("res", res)
    setTimeout(() => {
      alert(JSON.stringify(res))
    }, 1000)
  }

  return (
    <div className="mt-4 flex gap-4">
      <Button onClick={onAlertTest}>Alert Confirm</Button>
      <Button onClick={onAlertDelete}>Alert Delete</Button>
      <Button onClick={onAlertInfo}>Alert Info</Button>
      <Button onClick={onAlertInfoWithValidation}>
        Alert Info & Validation
      </Button>
      <Button onClick={onAlertInfoWithValidationPassData}>
        Alert Info & Validation & Pass Data
      </Button>
    </div>
  )
}
