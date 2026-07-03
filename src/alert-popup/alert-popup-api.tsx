import type { AlertPopupOptions } from "./alert-popup-provider"

/**
 * Interface definition for the internal Alert Popup Api.
 * This acts as a contract between the React provider component that manages dialog state
 * and the helper functions exported to the rest of the application.
 */
export interface AlertPopupApi {
  /**
   * Triggers the display of the Alert Dialog.
   * @param options Configuration options for the dialog.
   * @returns A promise that resolves with the response boolean and optional extra values from custom elements.
   */
  show: (
    options: AlertPopupOptions
  ) => Promise<{ response: boolean; [k: string]: any }>
}

/**
 * Singleton registry/mediator to hold reference to the active `show` function.
 * 
 * WHY THIS PATTERN IS USED:
 * This acts as a bridge. React components cannot easily expose imperative functions to non-React
 * code without hooks. By storing the function reference in a plain JavaScript object, we can
 * import and trigger the alert dialog from anywhere in our codebase—including inside hooks,
 * helper utilities, network interceptors, or standard event handlers.
 *
 * The AlertPopupProvider (rendered at the app root) overrides `alertPopupApi.show` with its
 * internal stateful `showAlertResolver` function upon mounting.
 */
const alertPopupApi: AlertPopupApi = {
  show: () => {
    console.error(
      "AlertDialogProvider not mounted yet. Make sure you render <AlertPopupProvider /> at your application root (e.g. main.tsx / App.tsx)."
    )
    return Promise.resolve({ response: false }) // Fallback resolved promise to prevent crashes if called prematurely
  },
}

export default alertPopupApi
