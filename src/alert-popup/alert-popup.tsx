import alertPopupApi from "./alert-popup-api"
import type { AlertPopupOptions } from "./alert-popup-provider"

/**
 * Publicly exported object containing developer-friendly imperative methods 
 * to trigger alert dialogs anywhere in the application.
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Simple Confirmation Dialog:
 * ```typescript
 * const { response } = await alertPopup.confirm({
 *   title: "Discard Changes?",
 *   description: "You have unsaved changes. Are you sure you want to exit?"
 * });
 * if (response) { // user clicked confirm }
 * ```
 * 
 * 2. Delete Action (Preconfigured style/labels):
 * ```typescript
 * const { response } = await alertPopup.delete({
 *   description: "This task will be permanently deleted."
 * });
 * if (response) { // delete task }
 * ```
 * 
 * 3. Dialog with Custom Fields & Custom Footer (Controlled Submission):
 * ```typescript
 * const result = await alertPopup.show({
 *   title: "Submit Feedback",
 *   customElement: <FeedbackForm />,
 *   customFooter: true,
 * });
 * if (result.response) {
 *   console.log("Feedback data:", result.input, result.rating);
 * }
 * ```
 */
const alertPopup = {
  /**
   * Triggers a customizable alert popup window.
   * @param options Custom styling, text labels, and child element configurations.
   * @returns Promise containing `{ response: boolean }` and any keys collected from custom elements.
   */
  show: (
    options: AlertPopupOptions
  ): Promise<{ response: boolean; [k: string]: any }> => {
    return alertPopupApi.show(options)
  },

  /**
   * Pre-styled confirmation dialog specialized for deletion actions.
   * Defaults to a destructive style (e.g. Red "Delete" button).
   * @param options Overrides for description text, labels, etc.
   */
  delete: (
    options?: Omit<AlertPopupOptions, "type">
  ): Promise<{ response: boolean; [k: string]: any }> => {
    return alertPopupApi.show({ ...options, type: "delete" })
  },

  /**
   * Pre-styled standard confirmation dialog.
   * Defaults to standard action tags ("Confirm", "Cancel").
   * @param options Overrides for titles, labels, or content.
   */
  confirm: (
    options?: Omit<AlertPopupOptions, "type">
  ): Promise<{ response: boolean; [k: string]: any }> => {
    return alertPopupApi.show({ ...options, type: "default" })
  },
}

export default alertPopup
