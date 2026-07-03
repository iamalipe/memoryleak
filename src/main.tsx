import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/style/custom.css"
import "@/style/index.css"

import { routeTree } from "@/routes/root-route"
import { createRouter, RouterProvider } from "@tanstack/react-router"
// @ts-ignore
import { registerSW } from "virtual:pwa-register"

if (typeof window !== "undefined") {
  registerSW({ immediate: true })
}

const router = createRouter({
  routeTree: routeTree,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById("root")
if (rootElement && !rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}
