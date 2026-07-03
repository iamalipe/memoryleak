import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog" // Assuming this path is correct
import { Button } from "@/components/ui/button"
import React, { useCallback, useEffect, useRef, useState } from "react"
import alertPopupApi from "./alert-popup-api"

/**
 * Options configured by the developer when invoking the Alert popup.
 */
export interface AlertPopupOptions {
  /** Text or React element rendered in the header title block */
  title?: React.ReactNode
  /** Text or React element rendered in the header description block */
  description?: React.ReactNode
  /** Label for the confirmation (OK) button */
  okText?: string
  /** 
   * A custom React component to render inside the dialog body. 
   * Useful for forms, list items, or input fields.
   */
  customElement?: React.ReactNode
  /** Label for the cancel button */
  cancelText?: string
  /** Predefined preset type which fills in default title/button style (e.g. 'delete' uses red colors) */
  type?: "default" | "delete"
  /**
   * If true, suppresses rendering the default shadcn footer buttons.
   * Use this when the `customElement` renders its own actions/buttons (e.g. forms with submission validation).
   */
  customFooter?: boolean
  /** Any custom data or initial state to pass through to the custom element props */
  passData?: any
}

// Preset defaults for common dialog situations
const defaultOptions: Record<
  Required<AlertPopupOptions>["type"],
  Partial<AlertPopupOptions>
> = {
  default: {
    title: "Are you sure?",
    description: "Please confirm your action.",
    okText: "Confirm",
    cancelText: "Cancel",
  },
  delete: {
    title: "Confirm Deletion",
    description:
      "This action cannot be undone. Are you sure you want to delete this?",
    okText: "Delete",
    cancelText: "Cancel",
  },
}

/**
 * Global Alert Dialog State Provider.
 * This component must be rendered once at the top level of the React tree.
 * 
 * HOW IT WORKS:
 * 1. Holds a single `isOpen` state and the current configuration `options` in state.
 * 2. When `alertPopup.show()` is called, `showAlertResolver` is run.
 * 3. It instantiates a new pending Promise and saves its `resolve`/`reject` in a stable `useRef` (`promiseRef`).
 * 4. It sets the modal to open (`isOpen = true`).
 * 5. When the user interacts (Confirm/Cancel/Submit), the modal resolves the promise and closes (`isOpen = false`).
 */
const AlertPopupProvider = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<AlertPopupOptions>({})
  
  // Holds the resolver and rejecter for the currently pending modal instance's promise
  const promiseRef = useRef<{
    resolve: (value: { response: boolean; [k: string]: any }) => void
    reject: (reason?: { response: boolean; [k: string]: any }) => void
  } | null>(null)

  // Holds the react ref assigned to the active custom element instance to query its values on confirm
  const currentCustomRef = useRef<React.RefObject<any> | null>(null)

  /**
   * Helper function to programmatically retrieve values from custom input forms.
   * Checks if the ref exposes a `getValues()` or `getValue()` method and pulls the data.
   */
  const extractCustomValues = async () => {
    let extra: Record<string, any> = {}
    try {
      const ref = currentCustomRef.current
      if (ref?.current) {
        if (typeof ref.current.getValues === "function") {
          const values = await ref.current.getValues()
          if (values && typeof values === "object") extra = values
        } else if (typeof ref.current.getValue === "function") {
          const v = await ref.current.getValue()
          if (v && typeof v === "object") extra = v
        } else if (typeof ref.current === "object") {
          if ("value" in ref.current) extra.value = ref.current.value
        }
      }
    } catch (e) {
      console.warn("Failed to extract custom values from ref:", e)
    }
    return extra
  }

  /**
   * Action handler triggered when the confirm button is clicked, or when the custom form submits.
   * Resolves the pending promise with `{ response: true, ...customFieldData }` and closes the dialog.
   */
  const handleConfirm = useCallback(async () => {
    if (!promiseRef.current) return
    const extra = await extractCustomValues()

    if (!promiseRef.current) return
    promiseRef.current.resolve({ response: true, ...extra })
    setIsOpen(false)
    promiseRef.current = null
    currentCustomRef.current = null
  }, [])

  /**
   * Action handler triggered when the cancel button is clicked.
   * Resolves the pending promise with `{ response: false }` and closes the dialog.
   */
  const handleCancel = useCallback(async () => {
    if (!promiseRef.current) return
    const extra = await extractCustomValues()

    if (!promiseRef.current) return
    promiseRef.current.resolve({ response: false, ...extra })
    setIsOpen(false)
    promiseRef.current = null
    currentCustomRef.current = null
  }, [])

  /**
   * Open State handler triggered by shadcn's underlying Radix primitives.
   * Ensures that if the dialog closes via backdrop click, Escape key, or external close triggers,
   * the active promise resolves cleanly with `{ response: false }` instead of hanging.
   */
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open && promiseRef.current) {
      promiseRef.current.resolve({ response: false })
      promiseRef.current = null
      currentCustomRef.current = null
    }
  }, [])

  /**
   * The core handler bound to the global mediator registry.
   * Sets options, registers callbacks/refs on custom children, and returns the interactive promise.
   */
  const showAlertResolver = useCallback(
    (opts: AlertPopupOptions) => {
      const typeDefaults = defaultOptions[opts.type || "default"] || {}
      
      // Instantiate a React Ref to capture inputs exposed via forwardRef & useImperativeHandle
      const customRef = React.createRef<any>()
      currentCustomRef.current = customRef

      // If a valid React component was provided as customElement, we clone it
      // to dynamically inject the ref, action handlers (onConfirm, onCancel), and passData so it can trigger submission
      const elementWithRef = React.isValidElement(opts.customElement)
        ? React.cloneElement(opts.customElement as React.ReactElement<any>, {
            ref: customRef,
            onConfirm: handleConfirm,
            onCancel: handleCancel,
            passData: opts.passData,
          })
        : opts.customElement

      const finalOptions = {
        ...typeDefaults,
        ...opts,
        customElement: elementWithRef,
      }

      setOptions(finalOptions)
      setIsOpen(true)

      // Create the promise returned to the code that called `alertPopup.show()`
      return new Promise<{ response: boolean; [k: string]: any }>(
        (resolve, reject) => {
          promiseRef.current = { resolve, reject }
        }
      )
    },
    [handleConfirm, handleCancel]
  )

  // Bind the internal resolver to the global importable API singleton registry
  useEffect(() => {
    alertPopupApi.show = showAlertResolver

    return () => {
      alertPopupApi.show = () => {
        console.error("AlertDialogProvider has unmounted.")
        return Promise.resolve({ response: false })
      }
    }
  }, [showAlertResolver])

  const okButtonVariant = options.type === "delete" ? "destructive" : "default"

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {options.title && (
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
            )}
            {options.description && (
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          
          {/* Custom dialog body content (e.g. form fields) */}
          {options.customElement && options.customElement}
          
          {/* Conditionally hide the default footer buttons if customFooter is set to true */}
          {!options.customFooter && (
            <AlertDialogFooter>
              {options.cancelText && (
                <AlertDialogCancel onClick={handleCancel}>
                  {options.cancelText}
                </AlertDialogCancel>
              )}
              {options.okText && (
                <Button onClick={handleConfirm} variant={okButtonVariant}>
                  {options.okText}
                </Button>
              )}
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default AlertPopupProvider
